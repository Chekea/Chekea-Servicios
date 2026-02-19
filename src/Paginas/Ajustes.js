import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  Typography,
  Container,
  Box,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  CircularProgress,
  Button,
  useTheme,
  useMediaQuery,
  IconButton,
  Stack,
  Chip,
  Divider,
  Alert as MUIAlert,
} from "@mui/material";

import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";

import { useLocation, useNavigate } from "react-router";
import Cabezal from "./componentes/Cabezal";

import app from "../Servicios/firebases";
import {
  getFirestore,
  collection,
  query,
  limit,
  doc,
  getDocs,
  where,
  getDoc,
  setDoc,
  increment,
  orderBy,
} from "firebase/firestore";

// Cache keys
const USER_INFO_CACHE_KEY = "user_info_cache";
const PRODUCTS_CACHE_KEY = "ajustes_products_cache_v1";
const USER_CACHE_EXPIRATION = 60 * 60 * 1000; // 1h cache contador

// ✅ Categorías por vendedora
const permisos = {
  "01": ["Complementos para peques", "Otros"],
  "1": ["Belleza & Accesorios", "Moda & Accesorios"],
  "001": ["Hogar", "Deporte"],
  "11": ["Electrónica", "Muebles", "Transporte"],
};

const computeInteraccionesScore = ({ isTop, rating, isDiscount, discountPercent }) => {
  let score = 5;

  if (isTop) score += 10;
  if (rating === "bajo") score += 2;
  if (rating === "medio") score += 4;
  if (rating === "alto") score += 6;

  if (isDiscount) {
    score += 3;
    const p = Number(discountPercent || 0);
    if (p >= 30) score += 2;
    else if (p >= 15) score += 1;
  }

  return Math.max(5, Math.min(20, score));
};

function safeNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function getProductsCacheKey(userName) {
  return `${PRODUCTS_CACHE_KEY}:${userName || "anon"}`;
}
const Ajustes = () => {
  const location = useLocation();
  const userName = String(location.state?.userName || "");
  const navigate = useNavigate();

  console.log(userName)

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const db = getFirestore(app);

  // ------------------------
  // Categorías permitidas
  // ------------------------
  const allowedCategories = useMemo(() => {
    const cats = permisos[userName] || [];
    return cats.filter(Boolean);
  }, [userName]);

  // ------------------------
  // State
  // ------------------------
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  // contador (Cantidad)
  const [nombre, setNombre] = useState(0);

  // evaluación local + persistida
  const [evals, setEvals] = useState({});
  const [msg, setMsg] = useState("");

  // refs para controlar refresh
  const lastMultipleRefreshRef = useRef(null);
  const inFlightRefreshRef = useRef(false);

  const defaultEval = useMemo(
    () => ({ isTop: false, rating: "", isDiscount: false, discountPercent: "" }),
    []
  );

  // ------------------------
  // Cache helpers (sessionStorage)
  // ------------------------
  const getCachedUser = useCallback((key) => {
    try {
      const cached = sessionStorage.getItem(key);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < USER_CACHE_EXPIRATION) return data;
        sessionStorage.removeItem(key);
      }
    } catch {}
    return null;
  }, []);

  const setCachedUser = useCallback((key, data) => {
    try {
      sessionStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
    } catch {}
  }, []);

  const loadProductsFromCache = useCallback(() => {
    try {
      const key = getProductsCacheKey(userName);
      const raw = sessionStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed?.items) return null;
      return parsed;
    } catch {
      return null;
    }
  }, [userName]);

  const saveProductsToCache = useCallback(
    (payload) => {
      try {
        const key = getProductsCacheKey(userName);
        sessionStorage.setItem(key, JSON.stringify(payload));
      } catch {}
    },
    [userName]
  );

  // ------------------------
  // Helpers: init evals from items
  // ------------------------
  const initEvalsFromItems = useCallback((items) => {
    const map = {};
    for (const p of items || []) {
      map[p.id] = {
        isTop: !!p.EvalTop,
        rating: p.EvalRating || "",
        isDiscount: !!p.EvalDiscount,
        discountPercent: p.EvalDiscountPercent || "",
      };
    }
    setEvals(map);
  }, []);

  // ------------------------
  // ✅ Firestore update evaluación
  // ------------------------
  const updateEvalFirestore = useCallback(
    async (productDocId, nextEval) => {
      const score = computeInteraccionesScore(nextEval);

      const productRef = doc(db, "productos", productDocId);
      await setDoc(productRef, { Interaccion: increment(Number(score) || 0) }, { merge: true });

      setProducts((prev) =>
        prev.map((p) =>
          p.id === productDocId
            ? { ...p, Interaccion: nextEval.rating || "", EvalUpdatedAt: Date.now() }
            : p
        )
      );
    },
    [db]
  );

  const setEvalAndPersist = useCallback(
    async (productId, updater) => {
      const current = evals[productId] || defaultEval;
      const next = typeof updater === "function" ? updater(current) : updater;

      setEvals((prev) => ({ ...prev, [productId]: next }));

      try {
        await updateEvalFirestore(productId, next);
        setMsg("✅ Guardado");
        setTimeout(() => setMsg(""), 1200);
      } catch (e) {
        console.error("❌ Error guardando evaluación:", e);
        setEvals((prev) => ({ ...prev, [productId]: current }));
        setMsg("❌ Error guardando");
        setTimeout(() => setMsg(""), 2000);
      }
    },
    [evals, defaultEval, updateEvalFirestore]
  );

  // ------------------------
  // ✅ Fetch productos (Firestore)
  // ------------------------
  const fetchProducts = useCallback(
    async ({ pageSize = 30 } = {}) => {
      if (!userName) {
        console.log('no hay')
        return [];
      } 
      if (!allowedCategories.length) {
        console.warn("Sin categorías en permisos para este vendedor.");
        return [];
      }

      const productosRef = collection(db, "productos");

     const q = query(
  productosRef,
  where("Imgreal", "==", false),
  where("Categoria", "==", "Hogar"),
  limit(25)
);


      const snap = await getDocs(q);
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // filtro por categorías permitidas (seguro)
      return items
    },
    [db, userName, allowedCategories]
  );

  // ------------------------
  // ✅ Load inicial: cache primero, si no -> fetch 1 vez
  // ------------------------
  const loadInitial = useCallback(async () => {
    setLoading(true);

    const cached = loadProductsFromCache();
    if (cached?.items?.length) {
      console.log('Cache')
      setProducts(cached.items);
      initEvalsFromItems(cached.items);
      setLoading(false);
      return;
    }

    try {
      const items = await fetchProducts({ pageSize: 30 });
      setProducts(items);
      saveProductsToCache({ items, savedAt: Date.now() });
      initEvalsFromItems(items);
    } catch (e) {
      console.error("loadInitial error:", e);
    } finally {
      setLoading(false);
    }
  }, [fetchProducts, loadProductsFromCache, saveProductsToCache, initEvalsFromItems]);

  // ------------------------
  // ✅ Refresco manual: IGNORA cache SOLO cuando se pulsa el botón
  // ------------------------
  const forceRefreshProducts = useCallback(async () => {
    if (!userName) return;

    try {
      setLoading(true);
      setMsg("🔄 Refrescando productos (sin cache)...");

      const items = await fetchProducts({ pageSize: 15 }); // cambia a 30/50 si quieres "ver más"
      setProducts(items);

      saveProductsToCache({ items, savedAt: Date.now() });
      initEvalsFromItems(items);

      setMsg("✅ Productos actualizados");
      setTimeout(() => setMsg(""), 1500);
    } catch (e) {
      console.error("forceRefreshProducts error:", e);
      setMsg("❌ Error refrescando productos");
      setTimeout(() => setMsg(""), 2000);
    } finally {
      setLoading(false);
    }
  }, [userName, fetchProducts, saveProductsToCache, initEvalsFromItems]);

  // ------------------------
  // ✅ Lectura del contador (Cantidad) SIEMPRE, refresco solo si múltiplo de 20
  // ------------------------
  const readCantidad = useCallback(async () => {
    if (!userName) return null;

    const cacheKey = `${USER_INFO_CACHE_KEY}_${userName}`;

    const cached = getCachedUser(cacheKey);
    if (cached != null && nombre === 0) setNombre(safeNumber(cached));

    try {
      const refDoc = doc(db, "GE_Info", "Nombres");
      const snapshot = await getDoc(refDoc);
      if (!snapshot.exists()) return null;

      const data = snapshot.data();
      let keyName;
      if (userName === "1") keyName = "as";
      else if (userName === "01") keyName = "maysa";
      else if (userName === "001") keyName = "Esteban";
      else if (userName === "11") keyName = "12";
      else return null;

      const valorLeido = safeNumber(data[keyName]);
      setNombre(valorLeido);
      setCachedUser(cacheKey, valorLeido);

      return valorLeido;
    } catch (e) {
      console.error("Error al leer el documento:", e);
      return null;
    }
  }, [userName, db, getCachedUser, setCachedUser, nombre]);

  const refreshProductsIfMultipleOf20 = useCallback(
    async (valorCantidad) => {
      const v = safeNumber(valorCantidad);
      if (!v) return;

      if (v % 20 !== 0) return;
      if (lastMultipleRefreshRef.current === v) return;

      if (inFlightRefreshRef.current) return;
      inFlightRefreshRef.current = true;

      try {
        setMsg(`🔄 Refrescando productos (múltiplo de 20: ${v})...`);
        const items = await fetchProducts({ pageSize: 15 });

        setProducts(items);
        saveProductsToCache({ items, savedAt: Date.now() });
        initEvalsFromItems(items);

        lastMultipleRefreshRef.current = v;
        setMsg(`✅ Productos refrescados (Cantidad=${v})`);
        setTimeout(() => setMsg(""), 1500);
      } catch (e) {
        console.error("refreshProductsIfMultipleOf20 error:", e);
        setMsg("❌ Error refrescando productos");
        setTimeout(() => setMsg(""), 2000);
      } finally {
        inFlightRefreshRef.current = false;
      }
    },
    [fetchProducts, saveProductsToCache, initEvalsFromItems]
  );

  // ------------------------
  // init: carga productos 1 vez + watcher contador cada 5s
  // ------------------------
  useEffect(() => {
    loadInitial();

    let alive = true;

    const tick = async () => {
      if (!alive) return;
      const v = await readCantidad();
      if (!alive) return;
      // await refreshProductsIfMultipleOf20(v);
    };

    tick();
    const id = setInterval(tick, 5000);

    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [loadInitial, readCantidad, refreshProductsIfMultipleOf20]);

  const HANDLEDETALES = useCallback(
    (codigoProducto) => {
      navigate(`/Buscar/Editar/${codigoProducto}/Exterior`, {
        state: { fromAjustes: true,userName:userName },
      });
    },
    [navigate]
  );

  return (
    <Container style={{ marginTop: isMobile ? 65 : 10 }}>
      <Cabezal texto={"Ajustes"} />

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          mb: 2,
          flexWrap: "wrap",
        }}
      >
        <Typography gutterBottom variant="h6" sx={{ fontWeight: "bold", m: 0 }}>
          {`Cantidad ${nombre}`}
        </Typography>

        <Button
          variant="contained"
          onClick={forceRefreshProducts}
          disabled={loading}
          sx={{ fontWeight: "bold" }}
        >
          Refrescar
        </Button>
      </Box>

      {!!msg && (
        <Box sx={{ mb: 2 }}>
          <MUIAlert
            severity={
              msg.startsWith("✅") ? "success" : msg.startsWith("🔄") ? "info" : "warning"
            }
          >
            {msg}
          </MUIAlert>
        </Box>
      )}

      {loading && products.length === 0 && (
        <Box sx={{ display: "flex", justifyContent: "center", my: 10 }}>
          <CircularProgress size={60} />
        </Box>
      )}

      {!loading && products.length === 0 && (
        <Typography variant="h6" sx={{ textAlign: "center", my: 4 }}>
          No se encontraron productos.
        </Typography>
      )}

      {products.length > 0 && (
        <Grid container spacing={3}>
          {products.map((product) => {
            const ev = evals[product.id] || defaultEval;

            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={product.id}>
                <Card
                  sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: 3,
                    borderRadius: 2,
                    transition: "transform 0.3s, box-shadow 0.3s",
                    "&:hover": { transform: "translateY(-5px)", boxShadow: 6 },
                    position: "relative",
                  }}
                >
                   

                  <Box sx={{ position: "absolute", top: 8, left: 8, zIndex: 2 }}>
                    <Stack direction="row" spacing={1}>
                      {ev.isTop && (
                        <Chip
                          size="small"
                          icon={<WorkspacePremiumIcon />}
                          label="TOP"
                          color="primary"
                        />
                      )}
                      {ev.rating === "alto" && (
                        <Chip size="small" label="Llamativo" color="success" />
                      )}
                    </Stack>
                  </Box>

                  {product.Imagen && (
                    <CardMedia
                      component="img"
                      height="200"
                      image={product.Imagen}
                      alt={product.Titulo}
                      sx={{
                        objectFit: "contain",
                        p: 1,
                        backgroundColor: "#f5f5f5",
                        maxHeight: 200,
                      }}
                    />
                  )}

                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography gutterBottom variant="h6" sx={{ fontWeight: "bold" }}>
                      {product.Titulo}
                    </Typography>

                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                      Categoría: {product.Categoria || "-"}
                    </Typography>

                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                      Subcategoría: {product.Subcategoria || "-"}
                    </Typography>

                    <Typography variant="h6" color="primary" sx={{ fontWeight: "bold" }}>
                      CFA {product.Precio}
                    </Typography>

                    <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap" }}>
                      <Chip
                        size="small"
                        variant="outlined"
                        label={`Interacciones: ${
                          product.PuntuacionInteracciones ?? computeInteraccionesScore(ev)
                        }/20`}
                      />
                    </Stack>

                    <Divider sx={{ my: 1.5 }} />
                  </CardContent>

                  <CardActions sx={{ justifyContent: "center", pb: 2 }}>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => HANDLEDETALES(product.Codigo)}
                      sx={{ fontWeight: "bold" }}
                    >
                      {product.Stock === 0 ? "Sin Stock" : "VER DETALLES"}
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Container>
  );
};

export default Ajustes;
