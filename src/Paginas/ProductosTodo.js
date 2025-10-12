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
import { useNavigate } from "react-router";
import Cabezal from "./componentes/Cabezal";

import app from "../Servicios/firebases";
import { compressImage } from "../ayuda";

import {
  getFirestore,
  collection,
  query,
  orderBy,
  startAfter,
  limit,
  updateDoc,
  doc,
  getDocs,
  where,
} from "firebase/firestore";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import axios from "axios";

const ProductoTodo = () => {
  const [products, setProducts] = useState([]);
  const [selectedChip, setSelectedChip] = useState("Nacional");
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmedSearch, setConfirmedSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchName, setSearchName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [priceRange, setPriceRange] = useState([0, 0]);
  const [productos, setProductos] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState("China");

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
  };
  // hola

  async function maisaprod(
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

      filtros.push(where("Vendedor", "==", "y7eJBoQ23feGEF3HAF2sZxpDKig1"));

      let q = query(productosRef, orderBy("Fecha", "desc"), ...filtros);
      const querySnapshot = await getDocs(q);

      const productosFiltrados = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const lastVisibleDoc =
        querySnapshot.docs[querySnapshot.docs.length - 1] || null;

      // ✅ Extraer la cantidad de productos
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

  // hola maysa
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
      // filtros.push(where("Vendedor", "==", "y7eJBoQ23feGEF3HAF2sZxpDKig1"));
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

  const handleConfirmSearch = async () => {
    setLoading(true);
    setProducts([]);
    setLastDoc(null);
    setHasMore(true);

    const { productosFiltrados, lastVisibleDoc } = await maisaprod(
      searchName,
      selectedCategory,
      priceRange,
      selectedLocation
    );

    setProducts(productosFiltrados);
    setLastDoc(lastVisibleDoc);
    setHasMore(!!lastVisibleDoc);
    setLoading(false);
  };

  const abrirFiltros = async () => {
    setDrawerOpen(false);
    await handleConfirmSearch();
  };

  const loadMore = async () => {
    if (!hasMore || loading) return;
    setLoading(true);

    const { productosFiltrados, lastVisibleDoc } = await buscarProductos(
      searchName,
      selectedCategory,
      priceRange,
      selectedLocation,
      lastDoc
    );

    setProducts((prev) => [...prev, ...productosFiltrados]);
    setLastDoc(lastVisibleDoc);
    setHasMore(!!lastVisibleDoc);
    setLoading(false);
  };

  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const db = getFirestore(app);

  const HANDLEDETALES = (codigo) => {
    navigate(`/Buscar/Editar/${codigo}/Exterior`);
  };
  //EIBY
  // 🧠 Restore saved state on mount
  useEffect(() => {
    const savedState = sessionStorage.getItem("productoTodoState");
    if (savedState) {
      const parsed = JSON.parse(savedState);
      setProducts(parsed.products || []);
      setSelectedCategory(parsed.selectedCategory || "");
      setSelectedLocation(parsed.selectedLocation || "China");
      setPriceRange(parsed.priceRange || [0, 0]);
      setSearchName(parsed.searchName || "");
      setLastDoc(parsed.lastDoc || null);
      setHasMore(parsed.hasMore ?? true);
    } else {
      buscarProductos();
    }
  }, []);

  // codigo real
  //   async function buscarProductos(
  //   searchName,
  //   selectedCategory,
  //   priceRange,
  //   selectedCountry, // nuevo parámetro
  //   lastVisible = null,
  //   pageSize = 12
  // ) {
  //   try {
  //     const productosRef = collection(db, "productos");
  //     let filtros = [];

  //     console.log(
  //       "Buscar productos con:",
  //       searchName,
  //       selectedCategory,
  //       priceRange,
  //       selectedCountry
  //     );

  //     // 🔹 Filtrar por tokens si hay texto
  //     if (searchName.trim() !== "") {
  //       const searchTokens = searchName.toLowerCase().split(" ");
  //       filtros.push(where("Ttoken", "array-contains-any", searchTokens));
  //       filtros.push(where("Pais", "==", selectedCountry));
  //     }

  //     // 🔹 Filtrar por categoría
  //     if (selectedCategory) {
  //       filtros.push(where("Categoria", "==", selectedCategory));
  //     }

  //     // 🔹 Filtrar por precio
  //     if (priceRange && (priceRange[0] !== 0 || priceRange[1] !== 0)) {
  //       filtros.push(where("Precio", ">=", priceRange[0]));
  //       filtros.push(where("Precio", "<=", priceRange[1]));
  //     }

  //     // 🔹 Base query ordenada por Precio
  //     let q = query(
  //       productosRef,
  //       orderBy("Precio", "asc"),
  //       ...filtros,
  //       limit(pageSize)
  //     );

  //     // 🔹 Continuar desde el último documento (paginación)
  //     if (lastVisible) {
  //       q = query(
  //         productosRef,
  //         orderBy("Precio", "asc"),
  //         ...filtros,
  //         startAfter(lastVisible),
  //         limit(pageSize)
  //       );
  //     }

  //     const querySnapshot = await getDocs(q);

  //     const productosFiltrados = querySnapshot.docs.map((doc) => ({
  //       id: doc.id,
  //       ...doc.data(),
  //     }));

  //     const lastVisibleDoc =
  //       querySnapshot.docs[querySnapshot.docs.length - 1] || null;

  //     console.log("Productos encontrados:", productosFiltrados);

  //     return { productosFiltrados, lastVisibleDoc };
  //   } catch (error) {
  //     console.error("Error buscando productos:", error);
  //     return { productosFiltrados: [], lastVisibleDoc: null };
  //   }
  // }

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
      // const ref = doc(db, "productos", id); // 👈 ajusta "productos" si tu colección se llama diferente
      // await updateDoc(ref, {
      //   Precio: Number(product.Precio) || 0,
      //   Peso: Number(product.Peso) || 0,
      // });

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
        setProducts(reset ? productData : [...products, ...productData]);
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
      <Typography
        gutterBottom
        variant="h6"
        component="div"
        sx={{ fontWeight: "bold" }}
      >
        {`Publicados por Maysa (${products.length})`}
      </Typography>
      <Box sx={{ display: "flex", justifyContent: "center", my: 2 }}>
        {/* <TextField
          label="Buscar producto..."
          variant="outlined"
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          sx={{ width: isMobile ? "100%" : "60%" }}
        /> */}

        <Button
          variant="contained"
          color="primary"
          onClick={() => handleConfirmSearch(false)}
          sx={{ fontWeight: "bold", height: "56px" }}
        >
          Buscar
        </Button>
        {/* <Button
          variant="contained"
          color="primary"
          onClick={() => setDrawerOpen(true)}
          sx={{ fontWeight: "bold", height: "56px", marginLeft: 5 }}
        >
          Filtros
        </Button> */}
      </Box>

      <Box>
        {loading && products.length === 0 && (
          <Box sx={{ display: "flex", justifyContent: "center", my: 10 }}>
            <CircularProgress size={60} />
          </Box>
        )}

        {!loading && products.length === 0 && (
          <Typography variant="h6" sx={{ textAlign: "center", my: 4 }}>
            No se encontraron productos
          </Typography>
        )}

        {products.length > 0 && (
          <>
            <Grid container spacing={3}>
              {products.map((product) => (
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
                      {/* Campo para editar Precio */}

                      <Typography
                        variant="h6"
                        color="primary"
                        sx={{ fontWeight: "bold" }}
                      >
                        CFA {product.Precio}
                      </Typography>
                    </CardContent>

                    {/* <CardActions sx={{ justifyContent: "center", pb: 2 }}>
                      <Button
                        variant="contained"
                        size="small"
                        // onClick={() => HANDLEDETALES(product.Codigo)}
                        sx={{ fontWeight: "bold" }}
                      >
                        {product.Stock === 0 ? "Sin Stock" : "VER DETALLES"}
                      </Button>
                    </CardActions> */}
                    {/* {product.RealImagen === undefined && (
                      <Typography
                        variant="h6"
                        color="primary"
                        sx={{ fontWeight: "bold", textAlign: "center", mb: 1 }}
                      >
                        No tiene Imagen Real
                      </Typography>
                    )} */}
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
              sessionStorage.removeItem("productoTodoState");
              handleCloseDrawer();
            }}
          >
            Borrar Filtros
          </Button>
        </Box>
      </Drawer>
    </Container>
  );
};

export default ProductoTodo;
