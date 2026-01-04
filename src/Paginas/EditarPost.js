import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  Grid,
  IconButton,
  Stack,
  TextField,
  Typography,
  Alert as MUIAlert,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

// ✅ RTDB (Realtime Database)
import { getDatabase, ref as rtdbRef, remove, update as rtdbUpdate } from "firebase/database";

// ✅ Storage
import {
  getStorage,
  ref as storageRef,
  deleteObject,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

// ✅ Firestore
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  increment,
  setDoc,
  updateDoc,
} from "firebase/firestore";

// ✅ Router (lo normal es react-router-dom)
import { useLocation, useNavigate, useParams } from "react-router-dom";

import app from "./../Servicios/firebases";
import Cabezal from "./componentes/Cabezal";
import Alert from "./componentes/Alert";
import { compressImage } from "../ayuda";

// ---------------------- Constantes ----------------------
const MAX_FILE_MB = 6;
const MAX_REAL_IMAGES = 2;

// PESOS (AÉREO)
const PESOS = [
  { nombre: "Ultraligero", min: 0.1, max: 0.5 },
  { nombre: "Ligero", min: 0.51, max: 1.1 },
  { nombre: "Medio", min: 1.2, max: 2.0 },
  { nombre: "Pesado", min: 2.01, max: 3.5 },
  { nombre: "Muy pesado", min: 3.51, max: 4.5 },
];

// Subcategorías
const SUBCATEGORIAS_MODA = [
  "Trajes",
  "Vestidos",
  "Bolsos",
  "Pantalones",
  "Calzado",
  "Camisas",
  "Otros",
];

// Género
const GENEROS = ["Femenina", "Masculina", "Mixto"];

// ---------------------- Alert descuento ----------------------
const AlertComponent = ({ isOpen, onClose, onConfirm }) => {
  const [inputValue, setInputValue] = useState("");

  const handleConfirm = () => {
    const v = Number(inputValue);
    if (Number.isFinite(v) && v < 90) onConfirm(v);
    else alert("Ha ocurido un error");
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogTitle>Introduzca Descuento</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Descuento en %"
          type="number"
          fullWidth
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleConfirm} color="primary">
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ---------------------- Componente principal ----------------------
const EditarPost = () => {
  const { codigo, contexto } = useParams(); // contexto puede venir o no
  const location = useLocation();
  const navigate = useNavigate();

  const fromAjustes = Boolean(location.state?.fromAjustes);
  const userName = String(location.state?.userName ?? "");

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const db = getFirestore(app);
  const database = getDatabase(app);

  // ---------------------- Estado principal ----------------------
  const [data, setData] = useState(null);
  const [img, setImg] = useState(false);

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [details, setDetails] = useState("");
  const [ubicacion, setUbicacion] = useState("");

  // Chips
  const [chipscolor, setChipscolor] = useState([]);
  const [chips, setChips] = useState([]);

  // Drawer chips
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerType, setDrawerType] = useState("color"); // "color" | "talla"
  const [dataChip, setDataChip] = useState(null);
  const [newColor, setNewColor] = useState("");
  const [newPrice, setNewPrice] = useState("");

  // Delete chip confirm
  const [open, setOpen] = useState(false);
  const [todelete, setToDelete] = useState(null);

  // Descuento
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [number, setNumber] = useState(null);

  // Peso
  const [selectedPeso, setSelectedPeso] = useState("");
  const [pesoActual, setPesoActual] = useState("");
  const [savingPeso, setSavingPeso] = useState(false);
  const [pesoMsg, setPesoMsg] = useState("");

  // Subcategoría/Género
  const [selectedSubcategoria, setSelectedSubcategoria] = useState("");
  const [subcategoriaActual, setSubcategoriaActual] = useState("");

  const [selectedGenero, setSelectedGenero] = useState("");
  const [generoActual, setGeneroActual] = useState("");

  const [savingSubGenero, setSavingSubGenero] = useState(false);
  const [subGeneroMsg, setSubGeneroMsg] = useState("");

  // Media
  const [videoLink, setVideoLink] = useState("");
  const [realImages, setRealImages] = useState([]);
  const [imagenesReales, setImagenesReales] = useState([]);
  const [savingMedia, setSavingMedia] = useState(false);
  const [mediaMsg, setMediaMsg] = useState("");

  // Guardado principal
  const [savingMain, setSavingMain] = useState(false);
  const [mainMsg, setMainMsg] = useState("");

  // Loading global
  const [loading, setLoading] = useState(false);

  // ---------------------- Helpers ----------------------
  const MARGEN = useCallback((preciobase) => {
    const p = Number(preciobase || 0);
    if (p <= 7000) return p > 0 ? p * 1.3 + 1500 : 0;
    if (p <= 25000) return p * 1.22 + 1000;
    if (p <= 250000) return p * 1.15;
    if (p <= 500000) return p * 1.12;
    return p * 1.08 + 100000;
  }, []);

  const lugar = useCallback(
    (pais) => (pais === "Guinea Ecuatorial" ? "Nacional" : "Exterior"),
    []
  );

  const savingAny = useMemo(
    () => loading || savingMain || savingMedia || savingPeso || savingSubGenero,
    [loading, savingMain, savingMedia, savingPeso, savingSubGenero]
  );

  // ---------------------- Cargar producto + subcolecciones ----------------------
  useEffect(() => {
    const fetchData = async () => {
      try {
        const productRef = doc(db, "productos", codigo);
        const docSnap = await getDoc(productRef);

        if (!docSnap.exists()) {
          setData(null);
          setChips([]);
          setChipscolor([]);
          return;
        }

        const productData = docSnap.data();
        setData(productData);

        setImg(Boolean(productData.Imgreal));
        setTitle(productData.Titulo ?? "");
        setUbicacion(productData.Ubicacion ?? "");
        setPrice(productData.Precio ?? "");
        setDetails(productData.Detalles ?? "");

        // Subcat/Género
        const subFromDB = productData?.Subcategoria ?? "";
        const genFromDB = productData?.Genero ?? "";
        setSubcategoriaActual(subFromDB);
        setSelectedSubcategoria(subFromDB);
        setGeneroActual(genFromDB);
        setSelectedGenero(genFromDB);

        // Peso
        const pesoFromDB = productData?.Peso ?? "";
        setPesoActual(pesoFromDB);
        setSelectedPeso(pesoFromDB);

        // Media
        setVideoLink(productData.id ?? "");
        setImagenesReales(productData.imagenesreales ?? []);

        // Subcolecciones
        const coloresRef = collection(db, "productos", codigo, "colores");
        const tallasRef = collection(db, "productos", codigo, "tallas");
        const [coloresSnap, tallasSnap] = await Promise.all([
          getDocs(coloresRef),
          getDocs(tallasRef),
        ]);

        setChipscolor(coloresSnap.docs.map((d) => d.data()) ?? []);
        setChips(tallasSnap.docs.map((d) => d.data()) ?? []);
      } catch (error) {
        console.error("❌ Error al obtener datos:", error);
      }
    };

    if (codigo) fetchData();
  }, [db, codigo]);

  // ---------------------- Drawer chips ----------------------
  const handleDrawerOpen = (type, chip = null) => {
    setDrawerType(type);
    setDataChip(chip);

    if (chip) {
      if (type === "talla") {
        setNewColor(chip.label ?? "");
        setNewPrice(chip.precio ?? 0);
      } else {
        setNewColor(chip.label ?? "");
        setNewPrice("");
      }
    } else {
      setNewColor("");
      setNewPrice("");
    }

    setDrawerOpen(true);
  };

  const handleDrawerClose = () => setDrawerOpen(false);

  const handleSaveNew = async () => {
    if (!newColor) return;

    const productoRef = doc(db, "productos", codigo);

    try {
      if (drawerType === "color") {
        if (dataChip?.id) {
          setChipscolor((prev) =>
            prev.map((c) => (c.id === dataChip.id ? { ...c, label: newColor } : c))
          );
          const colorRef = doc(collection(productoRef, "colores"), dataChip.id);
          await updateDoc(colorRef, { label: newColor });
        } else {
          const newDocRef = doc(collection(productoRef, "colores"));
          const newObj = { id: newDocRef.id, label: newColor };
          await setDoc(newDocRef, newObj);
          setChipscolor((prev) => [...prev, newObj]);
        }
      } else {
        const precios = parseInt(MARGEN(newPrice), 10);
        const chipObj = {
          label: newColor,
          precio: Number.isFinite(precios) ? precios : 0,
        };

        if (dataChip?.id) {
          setChips((prev) =>
            prev.map((c) => (c.id === dataChip.id ? { ...c, ...chipObj } : c))
          );
          const tallaRef = doc(collection(productoRef, "tallas"), dataChip.id);
          await updateDoc(tallaRef, { id: dataChip.id, ...chipObj });
        } else {
          const newTallaRef = doc(collection(productoRef, "tallas"));
          const newObj = { id: newTallaRef.id, ...chipObj };
          await setDoc(newTallaRef, newObj);
          setChips((prev) => [...prev, newObj]);
        }
      }
    } catch (e) {
      console.error("❌ Error guardando chip:", e);
      alert("Error guardando: " + (e?.message ?? "desconocido"));
    } finally {
      setDataChip(null);
      setNewColor("");
      setNewPrice("");
      setDrawerOpen(false);
    }
  };

  // ---------------------- Delete chip ----------------------
  const handleDeleteChip = (chipToDelete, tipo) => {
    setOpen(true);
    setToDelete(chipToDelete);
    setDrawerType(tipo);
  };
  const handleCloses = () => setOpen(false);

  const handleConfirmDeleteChip = async () => {
    try {
      const isColor = drawerType === "color";
      const subcollection = isColor ? "colores" : "tallas";

      if (isColor) setChipscolor((prev) => prev.filter((c) => c.id !== todelete.id));
      else setChips((prev) => prev.filter((c) => c.id !== todelete.id));

      const productoRef = doc(db, "productos", codigo);
      const chipRef = doc(collection(productoRef, subcollection), todelete.id);
      await deleteDoc(chipRef);
    } catch (error) {
      console.error("❌ Error eliminando chip:", error);
    } finally {
      handleCloses();
    }
  };

  // ---------------------- Descuento ----------------------
  const ActualizarDescuento = async (dato) => {
    try {
      const valor = parseInt(dato, 10);
      const context = lugar(data?.Pais);

      const dbRef = rtdbRef(database, `GE/${context}/Prod/${codigo}`);
      await rtdbUpdate(dbRef, { Descuento: valor });

      if (valor > 0) {
        const rebajasRef1 = rtdbRef(
          database,
          `GE/Filtros/${context}/${data?.Categoria}/${codigo}`
        );
        await rtdbUpdate(rebajasRef1, { Descuento: valor });
      } else {
        const rebajasRef = rtdbRef(database, `GE/Rebajas/${codigo}`);
        await remove(rebajasRef);
      }
    } catch (error) {
      console.error("Error updating data: ", error);
    }
  };

  const handleConfirmAlert = (value) => {
    setNumber(value);
    ActualizarDescuento(value);
  };

  // ---------------------- Guardar Peso ----------------------
  const savePeso = useCallback(async () => {
    setPesoMsg("");
    if (!selectedPeso) {
      setPesoMsg("❌ Selecciona un peso antes de guardar.");
      return;
    }

    setSavingPeso(true);
    try {
      const productoRef = doc(db, "productos", codigo);
      await updateDoc(productoRef, { Peso: selectedPeso });
      setPesoActual(selectedPeso);
      setPesoMsg("✅ Peso guardado correctamente.");
    } catch (e) {
      console.error(e);
      setPesoMsg("❌ Error guardando peso: " + (e?.message ?? "desconocido"));
    } finally {
      setSavingPeso(false);
    }
  }, [db, codigo, selectedPeso]);

  // ---------------------- Guardar Subcategoría + Género ----------------------
  const saveSubcategoriaGenero = useCallback(async () => {
    setSubGeneroMsg("");

    const esModa = (data?.Categoria ?? "").toLowerCase().includes("moda");
    if (!esModa) {
      setSubGeneroMsg("❌ Este producto no es de Moda & Accesorios.");
      return;
    }

    if (!selectedSubcategoria) {
      setSubGeneroMsg("❌ Selecciona una subcategoría antes de guardar.");
      return;
    }
    if (!selectedGenero) {
      setSubGeneroMsg("❌ Selecciona un género antes de guardar.");
      return;
    }

    setSavingSubGenero(true);
    try {
      const productoRef = doc(db, "productos", codigo);
      await setDoc(
        productoRef,
        { Subcategoria: selectedSubcategoria, Genero: selectedGenero },
        { merge: true }
      );

      setSubcategoriaActual(selectedSubcategoria);
      setGeneroActual(selectedGenero);

      setSubGeneroMsg("✅ Subcategoría y género guardados correctamente.");
    } catch (e) {
      console.error(e);
      setSubGeneroMsg("❌ Error guardando: " + (e?.message ?? "desconocido"));
    } finally {
      setSavingSubGenero(false);
    }
  }, [db, codigo, selectedSubcategoria, selectedGenero, data?.Categoria]);

  // ---------------------- Media (imágenes reales) ----------------------
  const handleRealImagesUpload = useCallback(
    async (event) => {
      const input = event.target;
      const files = Array.from(input.files || []);
      if (files.length === 0) return;

      if (files.length + realImages.length > MAX_REAL_IMAGES) {
        alert(`Solo puedes subir ${MAX_REAL_IMAGES} imágenes reales.`);
        input.value = "";
        return;
      }

      try {
        const processed = await Promise.all(
          files.map(async (file) => {
            if (!file.type.startsWith("image/")) {
              throw new Error(`Archivo no permitido: ${file.name}`);
            }
            if (file.size / 1024 / 1024 > MAX_FILE_MB) {
              throw new Error(`Imagen muy grande (${MAX_FILE_MB}MB máx): ${file.name}`);
            }

            const webpFile = await compressImage(file, {
              maxWidth: 1200,
              maxHeight: 900,
              quality: 0.8,
            });

            return webpFile;
          })
        );

        setRealImages((prev) => [...prev, ...processed]);
        setMediaMsg("");
      } catch (error) {
        console.error("Real image processing failed:", error);
        alert(error?.message ?? "Error procesando imágenes");
      } finally {
        input.value = "";
      }
    },
    [realImages.length]
  );

  const handleRemoveRealImage = (index) => {
    setRealImages((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadRealImageFile = async (file, index) => {
    const storage = getStorage(app);
    const path = `productos/${codigo}/imagenesreales/${index}_${Date.now()}_${file.name}`;
    const fileRef = storageRef(storage, path);
    await uploadBytes(fileRef, file);
    return await getDownloadURL(fileRef);
  };

  async function actualizarContador(username) {
    try {
      const userMap = {
        1: "as",
        "01": "maysa",
        "001": "Esteban",
      };

      const nombreCampo = userMap[username];
      if (!nombreCampo) return;

      const refDoc = doc(db, "GE_Info", "Nombres");
      const snapshot = await getDoc(refDoc);
      if (snapshot.exists()) {
        await updateDoc(refDoc, { [nombreCampo]: increment(1) });
      }
    } catch (error) {
      console.error("❌ Error al actualizar contador:", error);
    }
  }

  const saveMedia = async () => {
    setMediaMsg("");
    setSavingMedia(true);

    try {
      const productoRef = doc(db, "productos", codigo);

      const payload = { id: videoLink?.trim() || "" };

      if (realImages.length > 0) {
        const uploaded = await Promise.all(
          realImages.map((file, i) => uploadRealImageFile(file, i + 1))
        );
        const urls = uploaded.filter(Boolean).slice(0, 2);
        payload.ireal = urls;

        setImagenesReales(urls);
        setRealImages([]);
      }

      payload.Imgreal = true;

      if (userName) await actualizarContador(userName);

      await updateDoc(productoRef, payload);
      setMediaMsg("✅ Media subida correctamente.");
    } catch (e) {
      console.error(e);
      setMediaMsg("❌ Error subiendo media: " + (e?.message ?? "desconocido"));
    } finally {
      setSavingMedia(false);
    }
  };

  // ---------------------- Guardar datos principales ----------------------
  const saveMain = async () => {
    setMainMsg("");
    setSavingMain(true);
    try {
      const productoRef = doc(db, "productos", codigo);

      const updatedObject = {
        Titulo: title,
        Precio: parseInt(MARGEN(price), 10),
        Detalles: details,
        Ubicacion: ubicacion ?? "",
      };

      await updateDoc(productoRef, updatedObject);
      setMainMsg("✅ Datos guardados correctamente.");
    } catch (e) {
      console.error(e);
      setMainMsg("❌ Error guardando datos: " + (e?.message ?? "desconocido"));
    } finally {
      setSavingMain(false);
    }
  };

  // ---------------------- Eliminar producto completo ----------------------
  const confirmarEliminacion = (cod) => {
    if (!cod) return false;
    return window.confirm("¿Seguro que quieres eliminar este producto y todas sus imágenes?");
  };

  const getPathFromUrl = (url) => {
    try {
      const parts = url.split("?")[0].split("/o/")[1];
      return decodeURIComponent(parts);
    } catch {
      return null;
    }
  };

  const eliminarImagenes = async (imagenes = []) => {
    const storage = getStorage(app);
    for (const imgPath of imagenes) {
      try {
        const path = imgPath.startsWith("https") ? getPathFromUrl(imgPath) : imgPath;
        if (!path) continue;
        const imgRef = storageRef(storage, path);
        await deleteObject(imgRef);
      } catch (error) {
        console.warn(`No se pudo eliminar la imagen ${imgPath}:`, error);
      }
    }
  };

  const eliminarDocumentoFirestore = async (cod) => {
    const refDoc = doc(db, "productos", cod);
    await deleteDoc(refDoc);
  };

  const obtenerProducto = async (cod) => {
    const productoRef = doc(db, "productos", cod);
    const productoSnap = await getDoc(productoRef);
    if (!productoSnap.exists()) throw new Error("El producto no existe en Firestore.");
    return productoSnap.data();
  };

  const eliminarPostCompleto = async () => {
    if (!confirmarEliminacion(codigo)) return;

    setLoading(true);
    try {
      const producto = await obtenerProducto(codigo);
      const imagenes = producto.Imagenes || [];

      await eliminarImagenes(imagenes);
      await eliminarDocumentoFirestore(codigo);

      alert("✅ Producto y sus imágenes eliminados correctamente.");
      navigate("/");
    } catch (error) {
      console.error("❌ Error al eliminar:", error);
      alert("Error eliminando el producto: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ---------------------- UI ----------------------
  const esModa = useMemo(
    () => (data?.Categoria ?? "").toLowerCase().includes("moda"),
    [data?.Categoria]
  );

  return (
    <>
      {savingAny && (
        <Box
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            bgcolor: "rgba(0,0,0,0.4)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
          }}
        >
          <CircularProgress size={60} color="primary" />
        </Box>
      )}

      <Box sx={{ mt: 2, padding: 2 }}>
        <Cabezal texto={"Editar"} />

        {/* BOTÓN ELIMINAR (solo si NO vienes desde Ajustes, como en tu lógica) */}
        {!fromAjustes && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              mt: isMobile ? 4 : 0,
              gap: 1,
            }}
          >
            <Button
              variant="contained"
              color="error"
              onClick={eliminarPostCompleto}
              disabled={savingAny}
            >
              ELIMINAR PRODUCTO
            </Button>

            <Button variant="contained" color="info" onClick={() => setIsAlertOpen(true)}>
              APLICAR DESCUENTO
            </Button>
          </Box>
        )}

        {/* Mensajes */}
        <Box sx={{ mt: 2 }}>
          {mainMsg && (
            <MUIAlert severity={mainMsg.startsWith("✅") ? "success" : "warning"}>
              {mainMsg}
            </MUIAlert>
          )}
          {pesoMsg && (
            <MUIAlert sx={{ mt: 1 }} severity={pesoMsg.startsWith("✅") ? "success" : "warning"}>
              {pesoMsg}
            </MUIAlert>
          )}
          {subGeneroMsg && (
            <MUIAlert sx={{ mt: 1 }} severity={subGeneroMsg.startsWith("✅") ? "success" : "warning"}>
              {subGeneroMsg}
            </MUIAlert>
          )}
          {mediaMsg && (
            <MUIAlert sx={{ mt: 1 }} severity={mediaMsg.startsWith("✅") ? "success" : "warning"}>
              {mediaMsg}
            </MUIAlert>
          )}
        </Box>

        {/* AJUSTES: Subcategoría + Género */}
        {fromAjustes && (
          <Box sx={{ mt: 2, p: 1 }}>
            <Typography variant="subtitle1" gutterBottom>
              Subcategoría y Género (Moda & Accesorios)
            </Typography>

            <Typography variant="body2" sx={{ mb: 1, opacity: 0.85 }}>
              Subcategoría actual: <b>{subcategoriaActual || "Sin subcategoría"}</b>
              {" · "}
              Género actual: <b>{generoActual || "Sin género"}</b>
              {!esModa && (
                <>
                  {" · "}
                  <b style={{ color: "red" }}>No es Moda</b>
                </>
              )}
            </Typography>

            <Typography variant="subtitle2" sx={{ mt: 1, mb: 1, opacity: 0.9 }}>
              Subcategorías
            </Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
              {SUBCATEGORIAS_MODA.map((s) => (
                <Chip
                  key={s}
                  label={s}
                  color={selectedSubcategoria === s ? "primary" : "default"}
                  variant={selectedSubcategoria === s ? "filled" : "outlined"}
                  onClick={() => setSelectedSubcategoria(s)}
                  sx={{ mb: 1 }}
                />
              ))}
            </Stack>

            <Typography variant="subtitle2" sx={{ mt: 1, mb: 1, opacity: 0.9 }}>
              Género
            </Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
              {GENEROS.map((g) => (
                <Chip
                  key={g}
                  label={g}
                  color={selectedGenero === g ? "primary" : "default"}
                  variant={selectedGenero === g ? "filled" : "outlined"}
                  onClick={() => setSelectedGenero(g)}
                  sx={{ mb: 1 }}
                />
              ))}
            </Stack>

            <Button
              variant="contained"
              onClick={saveSubcategoriaGenero}
              disabled={savingSubGenero || !selectedSubcategoria || !selectedGenero}
              sx={{ mt: 1 }}
              fullWidth
            >
              {savingSubGenero ? "Guardando..." : "GUARDAR SUBCATEGORÍA Y GÉNERO"}
            </Button>

            <Divider sx={{ mt: 2 }} />
          </Box>
        )}

        {/* AJUSTES: Peso */}
        {fromAjustes && (
          <Box sx={{ mt: 2, p: 1 }}>
            <Typography variant="subtitle1" gutterBottom>
              Peso (Aéreo)
            </Typography>

            <Typography variant="body2" sx={{ mb: 1, opacity: 0.85 }}>
              Peso actual: <b>{pesoActual ? `${pesoActual}` : "Sin peso asignado"}</b>
            </Typography>

            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
              {PESOS.map((p) => (
                <Chip
                  key={p.nombre}
                  label={p.nombre}
                  color={selectedPeso === p.nombre ? "primary" : "default"}
                  variant={selectedPeso === p.nombre ? "filled" : "outlined"}
                  onClick={() => setSelectedPeso(p.nombre)}
                  sx={{ mb: 1 }}
                />
              ))}
            </Stack>

            <Button
              variant="contained"
              onClick={savePeso}
              disabled={savingPeso || !selectedPeso}
              sx={{ mt: 1 }}
              fullWidth
            >
              {savingPeso ? "Guardando peso..." : "GUARDAR PESO"}
            </Button>

            <Divider sx={{ mt: 2 }} />
          </Box>
        )}

        {/* AJUSTES: Media */}
        {fromAjustes && (
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={12}>
              {img ? (
                <Typography variant="subtitle1" gutterBottom color="red">
                  YA TIENE IMAGEN REAL
                </Typography>
              ) : (
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    Media del producto
                  </Typography>

                  <TextField
                    label="Link del video (se guarda en campo id)"
                    variant="outlined"
                    value={videoLink}
                    onChange={(e) => setVideoLink(e.target.value)}
                    fullWidth
                    placeholder="https://..."
                    sx={{ mb: 2 }}
                  />

                  <Button variant="outlined" component="label" disabled={savingMedia}>
                    Seleccionar imágenes reales (máx. 2)
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      multiple
                      onChange={handleRealImagesUpload}
                    />
                  </Button>

                  {realImages.length > 0 && (
                    <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: "wrap" }}>
                      {realImages.map((file, i) => (
                        <Box key={i} sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                          <Box
                            component="img"
                            src={URL.createObjectURL(file)}
                            alt={`real-new-${i}`}
                            sx={{ width: 90, height: 90, objectFit: "cover", borderRadius: 2 }}
                          />
                          <Button size="small" color="error" onClick={() => handleRemoveRealImage(i)}>
                            Quitar
                          </Button>
                        </Box>
                      ))}
                    </Stack>
                  )}

                  {imagenesReales.length > 0 && (
                    <>
                      <Typography variant="caption" sx={{ display: "block", mt: 2 }}>
                        Guardadas actualmente:
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap" }}>
                        {imagenesReales.map((url, i) => (
                          <Box
                            key={i}
                            component="img"
                            src={url}
                            alt={`real-saved-${i}`}
                            sx={{ width: 90, height: 90, objectFit: "cover", borderRadius: 2 }}
                          />
                        ))}
                      </Stack>
                    </>
                  )}

                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={saveMedia}
                    disabled={savingMedia}
                    fullWidth
                    sx={{ mt: 2 }}
                  >
                    {savingMedia ? "Subiendo media..." : "SUBIR MEDIA"}
                  </Button>
                </Box>
              )}
            </Grid>
          </Grid>
        )}

        {/* NO Ajustes: editor normal */}
        {!fromAjustes && (
          <>
            {/* Colores */}
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Colores
              </Typography>
              {chipscolor.map((chip, index) => (
                <Chip
                  key={chip.id ?? index}
                  label={chip.label}
                  sx={{ m: 0.5 }}
                  onClick={() => handleDrawerOpen("color", chip)}
                  onDelete={() => handleDeleteChip(chip, "color")}
                />
              ))}
              <IconButton color="primary" onClick={() => handleDrawerOpen("color")}>
                <AddIcon />
              </IconButton>
            </Box>

            {/* Tallas */}
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Tallas
              </Typography>
              {chips.map((chip, index) => (
                <Chip
                  key={chip.id ?? index}
                  label={`${chip.label} : ${chip.precio}`}
                  sx={{ m: 0.5 }}
                  onClick={() => handleDrawerOpen("talla", chip)}
                  onDelete={() => handleDeleteChip(chip, "talla")}
                />
              ))}
              <IconButton color="primary" onClick={() => handleDrawerOpen("talla")}>
                <AddIcon />
              </IconButton>
            </Box>

            {/* Form */}
            <Grid container spacing={2} sx={{ mt: 2 }}>
              <Grid item xs={12}>
                <TextField
                  label="Title"
                  variant="outlined"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  fullWidth
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Price"
                  variant="outlined"
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                  fullWidth
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Details"
                  variant="outlined"
                  multiline
                  rows={4}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  required
                  fullWidth
                />
              </Grid>

              <Grid item xs={12}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={saveMain}
                  disabled={savingMain}
                  fullWidth
                >
                  {savingMain ? "Guardando..." : "GUARDAR DATOS"}
                </Button>
              </Grid>
            </Grid>
          </>
        )}

        {/* Dialog descuento */}
        {number != null && <p>Entered number: {number}</p>}
        <AlertComponent
          isOpen={isAlertOpen}
          onClose={() => setIsAlertOpen(false)}
          onConfirm={handleConfirmAlert}
        />

        {/* Confirm delete chip */}
        <Alert
          open={open}
          message={"Seguro que desea borrar este valor?"}
          onClose={handleCloses}
          onConfirm={handleConfirmDeleteChip}
        />

        {/* Drawer chips */}
        <Drawer anchor="right" open={drawerOpen} onClose={handleDrawerClose}>
          <Box sx={{ width: 300, padding: 2 }}>
            <Typography variant="h6" gutterBottom>
              {drawerType === "color" ? "Nuevo Color" : "Nueva Talla"}
            </Typography>

            <TextField
              label={drawerType === "color" ? "Color" : "Talla"}
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              fullWidth
              margin="normal"
            />

            {drawerType === "talla" && (
              <TextField
                label="Precio"
                type="number"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                fullWidth
                margin="normal"
              />
            )}

            <Button variant="contained" color="primary" onClick={handleSaveNew} sx={{ mt: 2 }} fullWidth>
              Guardar
            </Button>
          </Box>
        </Drawer>
      </Box>
    </>
  );
};

export default EditarPost;
