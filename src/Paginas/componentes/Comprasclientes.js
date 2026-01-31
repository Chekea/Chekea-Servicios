import React, { useEffect, useState, useCallback } from "react";
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
  TextField,
  Drawer,
  Divider,
  MenuItem,
  Select,
  Slider,
  FormControl,
} from "@mui/material";
import { useLocation, useNavigate } from "react-router";
import Cabezal from "./componentes/Cabezal";

import app from "../Servicios/firebases";
import { compressImage } from "../ayuda";

import {
  getFirestore,
  collection,
  query,
  orderBy,
  limit,
  doc,
  getDocs,
  where,
  getDoc,
} from "firebase/firestore";
 

// Cache keys
const PRODUCT_CACHE_KEY = "ComprasClientes_complete_cache";
const USER_INFO_CACHE_KEY = "user_info_cache";
const PRODUCTS_DATA_CACHE_KEY = "products_data_cache";

// Tiempos de expiración en milisegundos
const CACHE_EXPIRATION = 30 * 60 * 1000; // 30 minutos
const USER_CACHE_EXPIRATION = 60 * 60 * 1000; // 1 hora

const ComprasClientes = () => {
  const location = useLocation();
  const userName = location.state?.userName || "";
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const db = getFirestore(app);

  // Cache management utilities
  const getCachedData = useCallback((key) => {
    try {
      const cached = sessionStorage.getItem(key);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_EXPIRATION) {
          return data;
        }
        sessionStorage.removeItem(key);
      }
    } catch (error) {
      console.error(`Error loading cache ${key}:`, error);
    }
    return null;
  }, []);

  const setCachedData = useCallback((key, data) => {
    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
      };
      sessionStorage.setItem(key, JSON.stringify(cacheData));
    } catch (error) {
      console.error(`Error saving cache ${key}:`, error);
    }
  }, []);

  const clearCache = useCallback(() => {
    [PRODUCT_CACHE_KEY, USER_INFO_CACHE_KEY, PRODUCTS_DATA_CACHE_KEY].forEach(
      (key) => {
        sessionStorage.removeItem(key);
      }
    );
  }, []);

  // 🎯 CARGAR ESTADO COMPLETO DESDE CACHÉ
  const loadCompleteStateFromCache = useCallback(() => {
    const cached = getCachedData(PRODUCT_CACHE_KEY);
    if (cached && cached.userName === userName) {
      console.log("📦 Cargando estado completo desde caché");
      return cached.state;
    }
    return null;
  }, [userName, getCachedData]);

  // 💾 GUARDAR ESTADO COMPLETO EN CACHÉ
  const saveCompleteStateToCache = useCallback(
    (state) => {
      const cacheData = {
        state,
        userName: userName,
      };
      setCachedData(PRODUCT_CACHE_KEY, cacheData);
    },
    [userName, setCachedData]
  );

  // Estados iniciales desde caché si existe
  const cachedState = loadCompleteStateFromCache();

  const [products, setProducts] = useState(cachedState?.products || []);
  const [selectedChip, setSelectedChip] = useState(
    cachedState?.selectedChip || "Nacional"
  );
  const [lastDoc, setLastDoc] = useState(cachedState?.lastDoc || null);
  const [hasMore, setHasMore] = useState(cachedState?.hasMore ?? true);
  const [loading, setLoading] = useState(false);
  const [searchName, setSearchName] = useState(cachedState?.searchName || "");
  const [selectedCategory, setSelectedCategory] = useState(
    cachedState?.selectedCategory || ""
  );
  const [priceRange, setPriceRange] = useState(
    cachedState?.priceRange || [0, 0]
  );
  const [selectedLocation, setSelectedLocation] = useState(
    cachedState?.selectedLocation || "China"
  );
  const [nombre, setNombre] = useState(cachedState?.nombre || "");
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  console.log("Productos cargados:", products);

  // 🔄 Cache para información de usuario
  const handleCantidad = useCallback(async () => {
    if (!userName) return;

    // const cacheKey = `${USER_INFO_CACHE_KEY}_${userName}`;
    // const cached = getCachedData(cacheKey);
    // if (cached) {
    //   setNombre(cached);
    //   return;
    // }

    try {
      const aslyRef = doc(db, "GE_Info", "Nombres");
      const snapshot = await getDoc(aslyRef);

      if (snapshot.exists()) {
        const data = snapshot.data();
        let nombre;

        if (userName === "1") {
          nombre = "Asly";
        } else if (userName === "01") {
          nombre = "Maysa";
        } else if (userName === "001") {
          nombre = "Vicky";
        } else if (userName === "11") {
          nombre = "Esteban";
        } else {
          console.log("Usuario no válido");
          return;
        }

        const valorLeido = data[nombre];
        setNombre(valorLeido);
        // setCachedData(cacheKey, valorLeido);
      }
    } catch (error) {
      console.error("Error al leer el documento:", error);
    }
  }, [userName, db, getCachedData, setCachedData]);

  // 🔄 Función optimizada para buscar productos con cache
  const maisaprod = useCallback(
    async (
      searchName,
      selectedCategory,
      priceRange,
      selectedCountry,
      lastVisible = null,
      pageSize = 10
    ) => {
      const cacheKey = `${PRODUCTS_DATA_CACHE_KEY}_${userName}_${searchName}_${selectedCategory}_${selectedCountry}`;

      // Solo usar cache para la primera carga, no para paginación
      if (!lastVisible) {
        const cached = getCachedData(cacheKey);
        if (cached) {
          console.log("📦 Usando productos desde caché");
          return cached;
        }
      }

      try {
        const productosRef = collection(db, "productos");
        let filtros = [where("Vendedor", "==", userName)];

        let q = query(
          productosRef,
          orderBy("Fecha", "desc"),
          ...filtros,
          limit(pageSize)
        );
        const querySnapshot = await getDocs(q);

        const productosFiltrados = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const lastVisibleDoc =
          querySnapshot.docs[querySnapshot.docs.length - 1] || null;
        const totalProductos = querySnapshot.size;

        console.log("Cantidad de productos encontrados:", totalProductos);

        const result = { productosFiltrados, lastVisibleDoc, totalProductos };

        // Solo cachear la primera página
        if (!lastVisible) {
          setCachedData(cacheKey, result);
        }

        return result;
      } catch (error) {
        console.error("Error buscando productos:", error);
        return {
          productosFiltrados: [],
          lastVisibleDoc: null,
          totalProductos: 0,
        };
      }
    },
    [userName, db, getCachedData, setCachedData]
  );

  const handleConfirmSearch = useCallback(
    async (useCache = true) => {
      // Si ya tenemos productos en caché y queremos usar el caché, no hacer nada
      if (useCache && products.length > 0 && cachedState) {
        console.log("✅ Usando datos en caché, evitando llamada a Firestore");
        setInitialLoadDone(true);
        return;
      }

      setLoading(true);

      // Solo limpiar si es una búsqueda nueva
      if (!useCache) {
        setProducts([]);
        setLastDoc(null);
        setHasMore(true);
      }

      const { productosFiltrados, lastVisibleDoc } = await maisaprod(
        searchName,
        selectedCategory,
        priceRange,
        selectedLocation
      );

      setProducts(productosFiltrados);
      setLastDoc(lastVisibleDoc);
      setHasMore(!!lastVisibleDoc);
      setInitialLoadDone(true);
      setLoading(false);
    },
    [
      products.length,
      cachedState,
      searchName,
      selectedCategory,
      priceRange,
      selectedLocation,
      maisaprod,
    ]
  );

  // Efectos optimizados
  useEffect(() => {
    handleCantidad();

    if (cachedState) {
      console.log(
        "🚀 Estado cargado desde caché, evitando llamadas a Firestore"
      );
      setInitialLoadDone(true);
    } else {
      handleConfirmSearch(false);
    }
  }, []); // Solo se ejecuta una vez al montar

  // 🔄 Guardar estado en caché solo cuando los datos importantes cambien
  useEffect(() => {
    if (initialLoadDone && products.length > 0) {
      const completeState = {
        products,
        selectedChip,
        lastDoc,
        hasMore,
        searchName,
        selectedCategory,
        priceRange,
        selectedLocation,
        nombre,
      };
      saveCompleteStateToCache(completeState);
    }
  }, [
    products,
    selectedChip,
    lastDoc,
    hasMore,
    searchName,
    selectedCategory,
    priceRange,
    selectedLocation,
    nombre,
    initialLoadDone,
    saveCompleteStateToCache,
  ]);

  const abrirFiltros = async () => {
    setDrawerOpen(false);
    await handleConfirmSearch(false);
  };

  const loadMore = async () => {
    if (!hasMore || loading) return;
    setLoading(true);
    // Lógica de carga adicional...
    setLoading(false);
  };

  const HANDLEDETALES = (codigo) => {
    navigate(`/Buscar/Editar/${codigo}/Exterior`);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
  };

  // Función para forzar recarga completa
  const forceReload = () => {
    clearCache();
    setInitialLoadDone(false);
    setProducts([]);
    setLastDoc(null);
    setHasMore(true);
    handleConfirmSearch(false);
  };

  return (
    <Container style={{ marginTop: isMobile ? 65 : 10 }}>
      <Cabezal texto={"Productos"} />

      {/* Indicador de caché */}
      {cachedState && (
        <Typography
          variant="caption"
          color="primary"
          sx={{ display: "block", textAlign: "center", mb: 1 }}
        >
          📦 Datos cargados desde caché (0 llamadas a Firestore)
        </Typography>
      )}

      <Typography
        gutterBottom
        variant="h6"
        component="div"
        sx={{ fontWeight: "bold" }}
      >
        {`Cantidad Publicados (${nombre})`}
      </Typography>

      <Box sx={{ display: "flex", justifyContent: "center", my: 2 }}>
        <TextField
          label="Buscar producto..."
          variant="outlined"
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          sx={{ width: isMobile ? "100%" : "60%" }}
        />

        <Button
          variant="contained"
          color="primary"
          onClick={() => handleConfirmSearch(false)}
          sx={{ fontWeight: "bold", height: "56px" }}
        >
          Buscar
        </Button>

        {/* Botón para forzar recarga */}
        <Button
          variant="outlined"
          onClick={forceReload}
          sx={{ fontWeight: "bold", height: "56px", marginLeft: 1 }}
          title="Forzar recarga de datos"
        >
          🔄
        </Button>
      </Box>

      <Box>
        {loading && products.length === 0 && (
          <Box sx={{ display: "flex", justifyContent: "center", my: 10 }}>
            <CircularProgress size={60} />
          </Box>
        )}

        {!loading && products.length === 0 && !cachedState && (
          <Typography variant="h6" sx={{ textAlign: "center", my: 4 }}>
            No se encontraron productos
          </Typography>
        )}

        {(products.length > 0 || cachedState) && (
          <>
            <Grid container spacing={3}>
              {(products.length > 0
                ? products
                : cachedState?.products || []
              ).map((product) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={product.id}>
                  <Card
                    sx={{
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      boxShadow: 3,
                      borderRadius: 2,
                      transition: "transform 0.3s, box-shadow 0.3s",
                      "&:hover": {
                        transform: "translateY(-5px)",
                        boxShadow: 6,
                      },
                    }}
                  >
                    {product.Imagen && (
                      <CardMedia
                        component="img"
                        height="200"
                        image={product.Imagen}
                        alt={product.Titulo}
                        sx={{
                          objectFit: "cover",
                          p: 1,
                          backgroundColor: "#f5f5f5",
                          maxHeight: 200,
                        }}
                      />
                    )}

                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography
                        gutterBottom
                        variant="h6"
                        component="div"
                        sx={{ fontWeight: "bold" }}
                      >
                        {product.Titulo}
                      </Typography>

                      <Typography
                        variant="h6"
                        color="primary"
                        sx={{ fontWeight: "bold" }}
                      >
                        CFA {product.Precio}
                      </Typography>
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
              ))}
            </Grid>

            {hasMore && (
              <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
                <Button
                  variant="outlined"
                  onClick={loadMore}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : null}
                  sx={{ fontWeight: "bold" }}
                >
                  {loading ? "Cargando..." : "Cargar más productos"}
                </Button>
              </Box>
            )}
          </>
        )}
      </Box>

      <Drawer anchor="right" open={drawerOpen} onClose={handleCloseDrawer}>
        <Box sx={{ width: 320, p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Filtros
          </Typography>

          <FormControl fullWidth sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Categoría
            </Typography>
            <Select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              displayEmpty
              sx={{ borderRadius: 2 }}
            >
              <MenuItem value="">Todas</MenuItem>
              <MenuItem value="electronica">Electrónica</MenuItem>
              <MenuItem value="ropa">Ropa</MenuItem>
              <MenuItem value="hogar">Hogar</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Pais
            </Typography>
            <Select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              displayEmpty
              sx={{ borderRadius: 2 }}
            >
              <MenuItem value="China">China</MenuItem>
              <MenuItem value="Guinea Ecuatorial">Guinea Ecuatorial</MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Precio
            </Typography>
            <Slider
              value={priceRange}
              onChange={(e, newValue) => setPriceRange(newValue)}
              valueLabelDisplay="auto"
              min={0}
              max={300000}
              step={10}
              sx={{ color: "primary.main" }}
            />
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography variant="body2">₡{priceRange[0]}</Typography>
              <Typography variant="body2">₡{priceRange[1]}</Typography>
            </Box>
          </Box>

          <Button
            variant="contained"
            color="primary"
            fullWidth
            onClick={() => {
              abrirFiltros();
              handleCloseDrawer();
            }}
          >
            Guardar Cambios
          </Button>

          <Button
            variant="contained"
            color="error"
            fullWidth
            onClick={() => {
              setSelectedCategory("");
              setSelectedLocation("");
              setPriceRange([0, 0]);
              forceReload();
              handleCloseDrawer();
            }}
            sx={{ mt: 1 }}
          >
            Borrar Filtros y Caché
          </Button>
        </Box>
      </Drawer>
    </Container>
  );
};

export default ComprasClientes;
