import React, { useEffect, useState } from "react";
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
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import axios from "axios";

// Cache key específica para este componente
const PRODUCT_CACHE_KEY = "productoTodo_complete_cache";

const ProductoTodo = () => {
  const location = useLocation();
  const userName = location.state?.userName || "";

  // Estado para controlar si ya se cargó desde caché
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // 🎯 CARGAR ESTADO COMPLETO DESDE CACHÉ
  const loadCompleteStateFromCache = () => {
    try {
      const cached = sessionStorage.getItem(PRODUCT_CACHE_KEY);
      if (cached) {
        const { data, timestamp, userName: cachedUser } = JSON.parse(cached);

        // Verificar si el caché es del mismo usuario y no tiene más de 30 minutos
        const isExpired = Date.now() - timestamp > 30 * 60 * 1000;
        const isSameUser = cachedUser === userName;

        if (!isExpired && isSameUser) {
          console.log("📦 Cargando estado completo desde caché");
          return data;
        } else {
          sessionStorage.removeItem(PRODUCT_CACHE_KEY);
        }
      }
    } catch (error) {
      console.error("Error cargando caché completo:", error);
    }
    return null;
  };

  // 💾 GUARDAR ESTADO COMPLETO EN CACHÉ
  const saveCompleteStateToCache = (state) => {
    try {
      const cacheData = {
        data: state,
        timestamp: Date.now(),
        userName: userName,
      };
      sessionStorage.setItem(PRODUCT_CACHE_KEY, JSON.stringify(cacheData));
      console.log("💾 Estado completo guardado en caché");
    } catch (error) {
      console.error("Error guardando estado completo en caché:", error);
    }
  };

  // 🧹 LIMPIAR CACHÉ
  const clearCache = () => {
    sessionStorage.removeItem(PRODUCT_CACHE_KEY);
    sessionStorage.removeItem("productoTodoState");
    console.log("🗑️ Caché limpiado");
  };

  // Estados iniciales desde caché si existe
  const cachedState = loadCompleteStateFromCache();

  const [products, setProducts] = useState(cachedState?.products || []);
  const [selectedChip, setSelectedChip] = useState(
    cachedState?.selectedChip || "Nacional"
  );
  const [lastDoc, setLastDoc] = useState(cachedState?.lastDoc || null);
  const [hasMore, setHasMore] = useState(cachedState?.hasMore ?? true);
  const [images, setImages] = useState(cachedState?.images || []);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState(cachedState?.searchTerm || "");
  const [confirmedSearch, setConfirmedSearch] = useState(
    cachedState?.confirmedSearch || ""
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchName, setSearchName] = useState(cachedState?.searchName || "");
  const [selectedCategory, setSelectedCategory] = useState(
    cachedState?.selectedCategory || ""
  );
  const [priceRange, setPriceRange] = useState(
    cachedState?.priceRange || [0, 0]
  );
  const [productos, setProductos] = useState(cachedState?.productos || []);
  const [selectedLocation, setSelectedLocation] = useState(
    cachedState?.selectedLocation || "China"
  );
  const [nombre, setNombre] = useState(cachedState?.nombre || "");

  console.log("Productos cargados:", products);

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
  };

  // 🔄 GUARDAR ESTADO COMPLETO CUANDO CAMBIE ALGUNA DEPENDENCIA IMPORTANTE
  useEffect(() => {
    if (initialLoadDone) {
      const completeState = {
        products,
        selectedChip,
        lastDoc,
        hasMore,
        images,
        searchTerm,
        confirmedSearch,
        searchName,
        selectedCategory,
        priceRange,
        productos,
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
    images,
    searchTerm,
    confirmedSearch,
    searchName,
    selectedCategory,
    priceRange,
    productos,
    selectedLocation,
    nombre,
    initialLoadDone,
  ]);

  async function maisaprod(
    searchName,
    selectedCategory,
    priceRange,
    selectedCountry,
    lastVisible = null,
    pageSize = 8
  ) {
    try {
      const productosRef = collection(db, "productos");
      let filtros = [];

      filtros.push(where("Vendedor", "==", userName));

      let q = query(
        productosRef,
        orderBy("Fecha", "desc"),
        ...filtros,
        limit(8)
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

      return { productosFiltrados, lastVisibleDoc, totalProductos };
    } catch (error) {
      console.error("Error buscando productos:", error);
      return {
        productosFiltrados: [],
        lastVisibleDoc: null,
        totalProductos: 0,
      };
    }
  }

  async function buscarProductos(
    searchName,
    selectedCategory,
    priceRange,
    selectedCountry,
    lastVisible = null,
    pageSize = 12
  ) {
    try {
      const productosRef = collection(db, "productos");
      let filtros = [];

      filtros.push(where("Categoria", "==", "Otros"));
      filtros.push(where("Pais", "==", "China"));

      let q = query(productosRef, orderBy("Precio", "asc"), ...filtros);
      const querySnapshot = await getDocs(q);

      const productosFiltrados = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const lastVisibleDoc =
        querySnapshot.docs[querySnapshot.docs.length - 1] || null;

      console.log("Productos encontrados:", productosFiltrados);

      return { productosFiltrados, lastVisibleDoc };
    } catch (error) {
      console.error("Error buscando productos:", error);
      return { productosFiltrados: [], lastVisibleDoc: null };
    }
  }

  async function handleCantidad() {
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
      } else {
        console.log("El documento 'asly' no existe");
      }
    } catch (error) {
      console.error("Error al leer el documento:", error);
    }
  }

  const handleConfirmSearch = async (useCache = true) => {
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
  };

  useEffect(() => {
    handleCantidad();

    // Si hay caché, marcar como cargado sin hacer llamadas
    if (cachedState) {
      console.log(
        "🚀 Estado cargado desde caché, evitando llamadas a Firestore"
      );
      setInitialLoadDone(true);
    } else {
      // Solo hacer la búsqueda si no hay caché
      handleConfirmSearch(false);
    }
  }, []);

  const abrirFiltros = async () => {
    setDrawerOpen(false);
    await handleConfirmSearch(false);
  };

  const loadMore = async () => {
    if (!hasMore || loading) return;
    setLoading(true);

    // const { productosFiltrados, lastVisibleDoc } = await buscarProductos(
    //   searchName,
    //   selectedCategory,
    //   priceRange,
    //   selectedLocation,
    //   lastDoc
    // );

    // const newProducts = [...products, ...productosFiltrados];
    // setProducts(newProducts);
    // setLastDoc(lastVisibleDoc);
    // setHasMore(!!lastVisibleDoc);
    // setLoading(false);
  };

  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const db = getFirestore(app);

  const HANDLEDETALES = (codigo) => {
    // Guardar estado actual antes de navegar
    const currentState = {
      products,
      selectedChip,
      lastDoc,
      hasMore,
      images,
      searchTerm,
      confirmedSearch,
      searchName,
      selectedCategory,
      priceRange,
      productos,
      selectedLocation,
      nombre,
    };
    saveCompleteStateToCache(currentState);
    navigate(`/Buscar/Editar/${codigo}/Exterior`);
  };

  // 🧠 Restore saved state on mount - ya no es necesario porque usamos cachedState inicial
  useEffect(() => {
    const savedState = sessionStorage.getItem("productoTodoState");
    if (savedState && !cachedState) {
      const parsed = JSON.parse(savedState);
      setProducts(parsed.products || []);
      setSelectedCategory(parsed.selectedCategory || "");
      setSelectedLocation(parsed.selectedLocation || "China");
      setPriceRange(parsed.priceRange || [0, 0]);
      setSearchName(parsed.searchName || "");
      setLastDoc(parsed.lastDoc || null);
      setHasMore(parsed.hasMore ?? true);
    }
  }, [cachedState]);

  // 💾 Save state automatically when it changes
  useEffect(() => {
    const stateToSave = {
      products,
      selectedCategory,
      selectedLocation,
      priceRange,
      searchName,
      lastDoc,
      hasMore,
    };
    sessionStorage.setItem("productoTodoState", JSON.stringify(stateToSave));
  }, [
    products,
    selectedCategory,
    selectedLocation,
    priceRange,
    searchName,
    lastDoc,
    hasMore,
  ]);

  const handleInputChange = (id, field, value) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const handleSaveProduct = async (id, product) => {
    try {
      console.log("Guardando producto:", id, product);
      console.log("✅ Producto actualizado:", id);
      alert("Producto actualizado correctamente");
    } catch (error) {
      console.error("❌ Error al actualizar producto:", error);
      alert("Error al actualizar producto");
    }
  };

  const all = async (reset = false) => {
    setLoading(true);
    try {
      const baseCollection = collection(db, "productos");
      const countryFilter = where("Pais", "==", "Guinea Ecuatorial");
      const priceOrder = orderBy("Precio", "desc");
      let productsQuery;

      if (!reset && lastDoc) {
        productsQuery = query(baseCollection, countryFilter, priceOrder);
      } else {
        productsQuery = query(baseCollection, countryFilter, priceOrder);
      }

      const snapshot = await getDocs(productsQuery);
      const productData = [];

      if (!snapshot.empty) {
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.RealImagen === undefined) {
            productData.push({ id: doc.id, ...data });
          }
        });

        const lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1];
        const newProducts = reset ? productData : [...products, ...productData];
        setProducts(newProducts);
        setLastDoc(lastVisibleDoc);
        setHasMore(snapshot.docs.length === 30);
      } else {
        if (reset) setProducts([]);
        setHasMore(false);
      }

      return productData;
    } catch (error) {
      console.error("Error fetching products:", error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const exportToExcelByCategory = async () => {
    const products = await all(true);
    const workbook = new ExcelJS.Workbook();

    const categories = {};
    products.forEach((product) => {
      const category = product.Categoria || "Sin Categoría";
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(product);
    });

    for (const categoryName in categories) {
      const worksheet = workbook.addWorksheet(categoryName);
      worksheet.columns = [
        { header: "Nombre", key: "nombre", width: 30 },
        { header: "Precio", key: "precio", width: 15 },
        { header: "Cantidad en Stock", key: "cantidad", width: 20 },
      ];

      categories[categoryName].forEach((product) => {
        worksheet.addRow({
          nombre: product.Titulo || "",
          precio: product.Precio || "",
          cantidad: product.Stock || 0,
        });
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/octet-stream" });
    saveAs(blob, "productos_por_categoria.xlsx");
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
          onClick={() => {
            clearCache();
            setInitialLoadDone(false);
            handleConfirmSearch(false);
          }}
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

                    {
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
                    }
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
              setProducts([]);
              setLastDoc(null);
              setHasMore(true);
              clearCache();
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

export default ProductoTodo;
