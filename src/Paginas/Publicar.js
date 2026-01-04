import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  IconButton,
  Chip,
  Input,
  TextField,
  Typography,
  Button,
  Grid,
  CircularProgress,
  Stack,
  Alert as MUIAlert,
  Divider,
} from "@mui/material";
import AddAPhotoIcon from "@mui/icons-material/AddAPhoto";

import { get, ref, getDatabase } from "firebase/database";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  getDocs,
  where,
  deleteField,
  collectionGroup,
  query as fsQuery,
} from "firebase/firestore";

import { capitalizeFirstLetter, compressImage } from "../ayuda";
import app from "./../Servicios/firebases";

import Cabezal from "./componentes/Cabezal";

import {
  getDownloadURL,
  getStorage,
  ref as storageref,
  uploadBytes,
} from "firebase/storage";
import { useLocation } from "react-router";
import { useNavigate } from "react-router-dom";


// -------------------------------
// Constantes
// -------------------------------
const MAX_IMAGES = 9;
const MIN_IMAGES_DEFAULT = 3;
const MAX_FILE_MB = 8;

const MAX_REAL_IMAGES = 2;
const MAX_REAL_FILE_MB = 6;

// -------------------------------
// Helper preview (ya lo tenías)
// -------------------------------
const ImagePreview = ({ file, onRemove, index }) => {
  const [src, setSrc] = useState("");

  useEffect(() => {
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setSrc(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return (
    <Box sx={{ position: "relative", display: "inline-block" }}>
      {file ? (
        <>
          <img
            src={src}
            alt="Preview"
            style={{ maxWidth: "100px", maxHeight: "100px" }}
          />
          <IconButton
            color="error"
            size="small"
            onClick={onRemove}
            sx={{ position: "absolute", top: 0, right: 0 }}
          >
            &times;
          </IconButton>
        </>
      ) : (
        <Box
          sx={{
            width: "100px",
            height: "100px",
            border: "1px dashed gray",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "gray",
          }}
        >
          {index + 1}
        </Box>
      )}
    </Box>
  );
};

// -------------------------------
// Categorías (igual que tenías)
// -------------------------------
const categorias = [
  {
    nombre: "Moda & Accesorios",
    subcategorias: ["Trajes", "Vestidos", "Bolsos", "Pantalones", "Calzado", "Camisas", "Otros"],
  },
  {
    nombre: "Complementos para peques",
    subcategorias: ["Bebés", "Niños", "Moda", "Otros"],
  },
  { nombre: "Deporte", subcategorias: ["Ropa", "Calzado", "Otros", "Gimnasio"] },
  { nombre: "Electrónica", subcategorias: ["Drones", "Tablets", "Electrodomesticos", "Camaras"] },
  { nombre: "Muebles", subcategorias: ["Sofas", "Mesas", "Sillas", "Armarios", "Camas"] },
  { nombre: "Transporte", subcategorias: ["Patin", "Scooter", "Deportivas"] },
  { nombre: "Belleza & Accesorios", subcategorias: ["Maquillaje", "Pelo", "Joyas", "Otros"] },
  {
    nombre: "Hogar",
    subcategorias: ["Otros", "Cocina", "Sala de estar", "Dormitorio", "Baño", "Decoración", "Iluminacion"],
  },
  { nombre: "Otros", subcategorias: ["Auriculares", "Smartwatch", "Otros"] },
];

const pesos = [
  { nombre: "Ultraligero", min: 0.1, max: 0.5 },
  { nombre: "Ligero", min: 0.51, max: 1.1 },
  { nombre: "Medio", min: 1.2, max: 2.0 },
  { nombre: "Pesado", min: 2.01, max: 3.5 },
  { nombre: "Muy pesado", min: 3.51, max: 4.5 },
  { nombre: "Extremadamente pesado", min: 4.51, max: 6.0 },
  { nombre: "Solo Barco", min: 7, max: 7 },
];

const dimensiones = [
  { nombre: "Paquete pequeño", min: 0.023, max: 0.03 },
  { nombre: "Tamaño personal", min: 0.031, max: 0.15 },
  { nombre: "Paquete mediano", min: 0.151, max: 0.4 },
  { nombre: "Paquete grande", min: 0.401, max: 0.8 },
  { nombre: "Caja estándar", min: 0.801, max: 1.2 },
  { nombre: "Caja extra grande", min: 1.201, max: 1.8 },
  { nombre: "Carga pesada", min: 1.801, max: 2.2 },
  { nombre: "Carga industrial", min: 2.201, max: 3.0 },
  { nombre: "Cama y sofa", min: 3.101, max: 7.0 },
];

// -------------------------------
// Permisos por usuario (igual idea)
// -------------------------------
function getCategoriasPorUsuario(username) {
  const user = String(username || "").trim().toLowerCase();

  const permisos = {
    "01": ["Belleza & Accesorios", "Moda & Accesorios"],
    "1": ["Belleza & Accesorios", "Moda & Accesorios"],
    "001": ["Belleza & Accesorios", "Moda & Accesorios"],
    "11": ["Electrónica", "Muebles", "Transporte"],
  };

  if (permisos[user]) {
    return categorias.filter((cat) => permisos[user].includes(cat.nombre));
  }
  return [];
}

// -------------------------------
// Publicar
// -------------------------------
const Publicar = () => {
  const storage = useMemo(() => getStorage(app), []);
  const database = useMemo(() => getDatabase(app), []);
  const db = useMemo(() => getFirestore(app), []);

  // user
 const location = useLocation();
const userName = location.state?.userName || "";
const navigate = useNavigate();

 

  // ---------- Form states ----------
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [details, setDetails] = useState("");

  const [selectedCategoria, setSelectedCategoria] = useState(null);
  const [selectedsubCategoria, setSelectedSubCategoria] = useState(null);
  const [selectedGender, setSelectedGender] = useState(null);

  const [selectedPeso, setSelectedPeso] = useState(null);
  const [selectedDimension, setSelectedDimension] = useState(null);

  const [chipscolor, setChipscolor] = useState([]);
  const [chips, setChips] = useState([]);
  const [prices, setPrices] = useState({});

  const [inputValue, setInputValue] = useState("");
  const [inputValues, setInputValues] = useState("");

  const [loading, setLoading] = useState(false);

  // ---------- Imágenes normales ----------
  const [images, setImages] = useState([]);

  // ---------- ✅ NUEVO: Imágenes reales (sección extra) ----------
  const [codigoCreado, setCodigoCreado] = useState(""); // id del producto creado
  const [videoLinkReal, setVideoLinkReal] = useState(""); // opcional (campo id)
  const [realImages, setRealImages] = useState([]); // File[]
  const [imagenesReales, setImagenesReales] = useState([]); // urls
  const [savingReal, setSavingReal] = useState(false);
  const [realMsg, setRealMsg] = useState("");

  // ---------- Helpers ----------
  const MARGEN = useCallback((preciobase) => {
    const p = Number(preciobase || 0);
    if (p <= 7000) return p * 1.3 + 1500;
    if (p <= 25000) return p * 1.22 + 1000;
    if (p <= 250000) return p * 1.15;
    if (p <= 500000) return p * 1.12;
    return p * 1.08 + 100000;
  }, []);

  const getCurrentTimeInMilliseconds = () => Date.now();

  function normalizarTexto(texto) {
    return String(texto || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s]/gi, "");
  }

  

  // País/origen fijos (como tu código)
  const country = "China";

  // -------------------------------
  // Upload imágenes normales (con compresión)
  // -------------------------------
  const handleImageUpload = useCallback(
    async (event) => {
      const input = event.target;
      const files = Array.from(input.files || []);
      if (files.length === 0) return;

      if (files.length + images.length > MAX_IMAGES) {
        alert(`You can upload up to ${MAX_IMAGES} images only.`);
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

        setImages((prev) => [...prev, ...processed]);
      } catch (error) {
        console.error("Image processing failed:", error);
        alert(error?.message ?? "Image processing failed");
      } finally {
        input.value = "";
      }
    },
    [images.length]
  );

  const handleRemoveImage = useCallback((index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // -------------------------------
  // Upload a storage imágenes normales
  // -------------------------------
  const uploadImagesToStorage = useCallback(
    async (imageFiles) => {
      const imageUrls = [];

      for (const imageFile of imageFiles) {
        if (!imageFile || !imageFile.type?.startsWith("image/")) {
          throw new Error("Archivo inválido (no es imagen)");
        }

        const uniqueId =
          (crypto.randomUUID && crypto.randomUUID()) ||
          `${Date.now()}-${Math.random().toString(16).slice(2)}`;

        const ext =
          imageFile.type === "image/webp"
            ? "webp"
            : imageFile.type === "image/png"
            ? "png"
            : "jpg";

        const imageRef = storageref(storage, `Imagenes/Productos/${uniqueId}.${ext}`);

        await uploadBytes(imageRef, imageFile, {
          contentType: imageFile.type,
          cacheControl: "public,max-age=31536000,immutable",
        });

        const imageUrl = await getDownloadURL(imageRef);
        imageUrls.push(imageUrl);
      }

      return imageUrls;
    },
    [storage]
  );

  // -------------------------------
  // Separar imágenes (principal + extras)
  // -------------------------------
  const separateImages = useCallback((imageUrls) => {
    if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
      throw new Error("Debes proporcionar al menos una imagen.");
    }
    if (imageUrls.length === 1) return { principal: imageUrls[0], extraImages: [] };
    return { principal: imageUrls[0], extraImages: imageUrls.slice(1) };
  }, []);

  // -------------------------------
  // Subcolecciones (colores, tallas, extras)
  // -------------------------------
  const createColorsNode = useCallback(
    async (codigo, colors) => {
      const productoRef = doc(db, "productos", codigo);
      for (const color of colors) {
        const colorId = doc(collection(db, `productos/${codigo}/colores`)).id;
        await setDoc(doc(collection(productoRef, "colores"), colorId), {
          id: colorId,
          label: color,
        });
      }
    },
    [db]
  );

  const createSizesNode = useCallback(
    async (codigo, sizes, pricesMap) => {
      const productoRef = doc(db, "productos", codigo);
      for (const size of sizes) {
        const sizeId = doc(collection(db, `productos/${codigo}/tallas`)).id;
        const precio = Number(pricesMap[size] || 0);
        await setDoc(doc(collection(productoRef, "tallas"), sizeId), {
          id: sizeId,
          label: size,
          precio: Number.isFinite(precio) && precio > 0 ? parseInt(MARGEN(precio), 10) : 0,
        });
      }
    },
    [db, MARGEN]
  );

  const uploadExtraImages = useCallback(
    async (codigo, extraImages) => {
      const productoRef = doc(db, "productos", codigo);
      for (const url of extraImages) {
        const imgId = doc(collection(db, `productos/${codigo}/imagenes`)).id;
        await setDoc(doc(collection(productoRef, "imagenes"), imgId), {
          id: imgId,
          Imagen: url,
        });
      }
    },
    [db]
  );

  // -------------------------------
  // Preparar datos comunes del producto
  // -------------------------------
  const prepareCommonData = useCallback(
    async (codigo, fecha) => {
      const titulonormalizado = normalizarTexto(title);
      const tokens = titulonormalizado
        .split(" ")
        .filter((word) => word.length >= 4)
        .slice(0, 6);

      const data = {
        Titulo: title,
        Ttoken: tokens,
        Categoria: selectedCategoria,
        Subcategoria: selectedsubCategoria,
        Codigo: codigo,
        Precio: parseInt(MARGEN(price), 10),
        Peso: selectedPeso,
        Dimension: selectedDimension || "Paquete mediano",
        Detalles: details,
        Vistos: 0,
        visible: true,
        Vendedor: userName,
        Fecha: fecha,
        Pais: country,
      };

      // Stock solo si NO es China (en tu código era country !== China)
      // Como aquí country está fijo en China, lo dejo por si lo cambias:
      if (country !== "China") data.Stock = parseInt(cantidad || 0, 10);

      if (selectedCategoria === "Moda & Accesorios" && selectedGender) {
        data.Genero = selectedGender;
      }

      return data;
    },
    [
      title,
      selectedCategoria,
      selectedsubCategoria,
      price,
      selectedPeso,
      selectedDimension,
      details,
      userName,
      cantidad,
      selectedGender,
      MARGEN,
      country,
    ]
  );

  // -------------------------------
  // Actualizar contador (tu versión)
  // -------------------------------
  const actualizarContador = useCallback(
    async (username) => {
      try {
        const userMap = {
          1: "Asly",
          "01": "Maysa",
          "001": "Vicky",
          11: "Esteban",
        };

        const nombreCampo = userMap[username];
        if (!nombreCampo) return;

        const refDoc = doc(db, "GE_Info", "Nombres");
        const snapshot = await getDoc(refDoc);
        if (!snapshot.exists()) return;

        const data = snapshot.data();
        const valorActual = data[nombreCampo] || 0;
        await updateDoc(refDoc, { [nombreCampo]: valorActual + 1 });
      } catch (error) {
        console.error("❌ Error al actualizar contador:", error);
      }
    },
    [db]
  );

  // -------------------------------
  // UI Handlers (chips)
  // -------------------------------
  const handleCategoriaClick = useCallback((nombre) => {
    setSelectedCategoria((prev) => (prev === nombre ? null : nombre));
    setSelectedSubCategoria(null);
  }, []);

  const categoriaSeleccionada = useMemo(
    () => categorias.find((cat) => cat.nombre === selectedCategoria),
    [selectedCategoria]
  );

  const handleChipClickPeso = useCallback((pesoName) => {
    setSelectedPeso((prev) => (prev === pesoName ? null : pesoName));
  }, []);

  const handleChipClickCategoria = useCallback((sub) => {
    setSelectedSubCategoria((prev) => (prev === sub ? null : sub));
  }, []);

  const handleChipClickDimension = useCallback((dimensionName) => {
    setSelectedDimension((prev) => (prev === dimensionName ? null : dimensionName));
  }, []);

  const handleAddChipColor = useCallback(
    (e) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        const v = inputValue.trim();
        if (!v) return;
        setChipscolor((prev) => [...prev, capitalizeFirstLetter(v)]);
        setInputValue("");
      }
    },
    [inputValue]
  );

  const handleAddChipTalla = useCallback(
    (e) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        const v = inputValues.trim();
        if (!v) return;
        const name = capitalizeFirstLetter(v);
        setChips((prev) => [...prev, name]);
        setPrices((prev) => ({ ...prev, [name]: "" }));
        setInputValues("");
      }
    },
    [inputValues]
  );

  const handleDeleteChipColor = useCallback((chipToDelete) => {
    setChipscolor((prev) => prev.filter((c) => c !== chipToDelete));
  }, []);

  const handleDeleteChipTalla = useCallback((chipToDelete) => {
    setChips((prev) => prev.filter((c) => c !== chipToDelete));
    setPrices((prev) => {
      const copy = { ...prev };
      delete copy[chipToDelete];
      return copy;
    });
  }, []);

  const handlePriceChanges = useCallback((e, chipName) => {
    setPrices((prev) => ({ ...prev, [chipName]: e.target.value }));
  }, []);

  // -------------------------------
  // ✅ NUEVO: imágenes reales (subir + guardar)
  // -------------------------------
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
            if (file.size / 1024 / 1024 > MAX_REAL_FILE_MB) {
              throw new Error(`Imagen muy grande (${MAX_REAL_FILE_MB}MB máx): ${file.name}`);
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
        setRealMsg("");
      } catch (e) {
        console.error("Real image processing failed:", e);
        alert(e?.message ?? "Error procesando imágenes reales");
      } finally {
        input.value = "";
      }
    },
    [realImages.length]
  );

  const handleRemoveRealImage = useCallback((index) => {
    setRealImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const uploadRealImageFile = useCallback(
    async (file, index, codigo) => {
      const ext = file.type === "image/webp" ? "webp" : "jpg";
      const path = `productos/${codigo}/imagenesreales/${index}_${Date.now()}.${ext}`;
      const imageRef = storageref(storage, path);

      await uploadBytes(imageRef, file, {
        contentType: file.type,
        cacheControl: "public,max-age=31536000,immutable",
      });

      return await getDownloadURL(imageRef);
    },
    [storage]
  );

  const saveRealMedia = useCallback(async () => {
    setRealMsg("");

    if (!codigoCreado) {
      setRealMsg("❌ Primero publica el producto para generar el código.");
      return;
    }
    if (realImages.length === 0) {
      setRealMsg("❌ Selecciona al menos 1 imagen real.");
      return;
    }

    setSavingReal(true);
    try {
      const uploaded = await Promise.all(
        realImages.map((file, i) => uploadRealImageFile(file, i + 1, codigoCreado))
      );
      const urls = uploaded.filter(Boolean).slice(0, MAX_REAL_IMAGES);

      const productoRef = doc(db, "productos", codigoCreado);
      await updateDoc(productoRef, {
        Imgreal: true,
        ireal: urls,
        id: (videoLinkReal || "").trim(),
      });

      setImagenesReales(urls);
      setRealImages([]);
      setRealMsg("✅ Imágenes reales subidas correctamente.");
      navigate(-1); // vuelve a la página anterior

    } catch (e) {
      console.error("❌ Error subiendo imágenes reales:", e);
      setRealMsg("❌ Error subiendo imágenes reales: " + (e?.message ?? "desconocido"));
    } finally {
      setSavingReal(false);
      
    }
  }, [codigoCreado, realImages, uploadRealImageFile, db, videoLinkReal]);

  // -------------------------------
  // Submit principal
  // -------------------------------
  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setLoading(true);

      try {
        // Validaciones mínimas (igual idea que tu código)
        const minRequired = selectedsubCategoria === "Pelo" ? 1 : MIN_IMAGES_DEFAULT;
        if (images.length < minRequired) {
          throw new Error(`Cuidado!!! Se necesitan al menos ${minRequired} imágenes para continuar.`);
        }
        if (!selectedCategoria) throw new Error("Cuidado!!!, no haz seleccionado la categoría");
        if (!selectedsubCategoria) throw new Error("Cuidado!!!, no haz seleccionado la subcategoría");
        if (!selectedPeso) throw new Error("Cuidado!!!, no haz seleccionado un peso.");

        if (selectedCategoria === "Moda & Accesorios" && !selectedGender) {
          throw new Error("Cuidado!!!, no haz seleccionado un género.");
        }

        if ((!chipscolor || chipscolor.length === 0) && (!chips || chips.length === 0)) {
          throw new Error("Cuidado!!!, debes agregar al menos un color o un estilo para continuar.");
        }

        // Crear producto
        const newItemRef = doc(collection(db, "productos"));
        const codigo = newItemRef.id;

        const fecha = getCurrentTimeInMilliseconds();
        let commonData = await prepareCommonData(codigo, fecha);

        // Subir imágenes normales
        const imageUrls = await uploadImagesToStorage(images);

        // Separar principal/extras
        const { principal, extraImages } = separateImages(imageUrls);

        commonData.Imagen = principal;

        // Guardar doc principal
        await setDoc(newItemRef, commonData);

        // Subir extras a subcolección
        if (extraImages.length > 0) {
          await uploadExtraImages(codigo, extraImages);
        }

        // Colores y tallas
        if (chipscolor.length > 0) await createColorsNode(codigo, chipscolor);
        if (chips.length > 0) await createSizesNode(codigo, chips, prices);

        await actualizarContador(userName);

        // ✅ Guardar codigo para habilitar sección "imágenes reales"
        setCodigoCreado(codigo);
        setImagenesReales([]);
        setRealImages([]);
        setVideoLinkReal("");
        setRealMsg("");

        // Reset del formulario principal (pero NO borres codigoCreado)
        setImages([]);
        setChipscolor([]);
        setChips([]);
        setPrices({});
        setTitle("");
        setDetails("");
        setPrice("");
        setCantidad("");
        setSelectedCategoria(null);
        setSelectedSubCategoria(null);
        setSelectedPeso(null);
        setSelectedDimension(null);
        setSelectedGender(null);
        setInputValue("");
        setInputValues("");

        alert(`✅ Producto subido correctamente! Código: ${codigo}`);
      } catch (error) {
        console.error("Error al subir el producto:", error);
        alert("ERROR INESPERADO: " + (error?.message ?? "desconocido"));
      } finally {
        setLoading(false);
      }
    },
    [
      images,
      selectedsubCategoria,
      selectedCategoria,
      selectedPeso,
      selectedGender,
      chipscolor,
      chips,
      db,
      prepareCommonData,
      uploadImagesToStorage,
      separateImages,
      uploadExtraImages,
      createColorsNode,
      createSizesNode,
      prices,
      actualizarContador,
      userName,
    ]
  );

  // -------------------------------
  // Render
  // -------------------------------
  return (
    <>
      {loading && (
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

      <Box sx={{ paddingTop: { xs: 10, sm: 20 } }}>
        <Cabezal texto={"Publicar Prod"} />

        {/* ------------------ Imágenes normales ------------------ */}
        <Grid item xs={12} sx={{ px: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Mínimo {selectedsubCategoria === "Pelo" ? 1 : MIN_IMAGES_DEFAULT} imágenes (Máx {MAX_IMAGES})
          </Typography>

          <input
            accept="image/*"
            id="upload-images"
            multiple
            type="file"
            style={{ display: "none" }}
            onChange={handleImageUpload}
          />

          <label htmlFor="upload-images">
            <IconButton color="primary" component="span">
              <AddAPhotoIcon />
            </IconButton>
          </label>

          <Box sx={{ mt: 2, display: "flex", flexWrap: "wrap", gap: 2 }}>
            {images.map((file, index) => (
              <Box key={index}>
                <ImagePreview file={file} onRemove={() => handleRemoveImage(index)} index={index} />
              </Box>
            ))}
          </Box>
        </Grid>

        <Box component="form" onSubmit={handleSubmit} sx={{ padding: 2, paddingTop: 4 }}>
          {/* ------------------ Categorías ------------------ */}
          <Box sx={{ width: "100%", p: 2 }}>
            <Typography variant="h6" textAlign="center" sx={{ mb: 2 }}>
              Categorías
            </Typography>

            <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "center", mb: 2 }}>
              {getCategoriasPorUsuario(userName).map((cat) => (
                <Chip
                  key={cat.nombre}
                  label={cat.nombre}
                  clickable
                  onClick={() => handleCategoriaClick(cat.nombre)}
                  color={selectedCategoria === cat.nombre ? "primary" : "default"}
                  sx={{ m: 0.5, fontSize: 14 }}
                />
              ))}
            </Box>

            {categoriaSeleccionada && (
              <Box
                sx={{
                  width: "100%",
                  mt: 2,
                  p: 2,
                  border: "2px solid #ccc",
                  borderRadius: 2,
                  position: "relative",
                  backgroundColor: "#fff",
                }}
              >
                <Typography
                  sx={{
                    position: "absolute",
                    top: -12,
                    left: 20,
                    backgroundColor: "#fff",
                    px: 1,
                    fontSize: 16,
                    fontWeight: "bold",
                    color: "#333",
                  }}
                >
                  Subcategorías de {categoriaSeleccionada.nombre}
                </Typography>

                <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "center" }}>
                  {categoriaSeleccionada.subcategorias.map((sub) => (
                    <Chip
                      key={sub}
                      label={sub}
                      sx={{ m: 0.5 }}
                      onClick={() => handleChipClickCategoria(sub)}
                      color={selectedsubCategoria === sub ? "primary" : "default"}
                      clickable
                    />
                  ))}
                </Box>
              </Box>
            )}
          </Box>

          {/* ------------------ Género (Moda) ------------------ */}
          {categoriaSeleccionada?.nombre === "Moda & Accesorios" && (
            <Box sx={{ width: "100%", mt: 2, p: 2, border: "2px solid #ccc", borderRadius: 2, position: "relative", backgroundColor: "#fff" }}>
              <Typography
                sx={{
                  position: "absolute",
                  top: -12,
                  left: 20,
                  backgroundColor: "#fff",
                  px: 1,
                  fontSize: 16,
                  fontWeight: "bold",
                  color: "#333",
                }}
              >
                Género
              </Typography>

              <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "center" }}>
                {["Femenina", "Masculina", "Mixto"].map((gender) => (
                  <Chip
                    key={gender}
                    label={gender}
                    sx={{ m: 0.5 }}
                    clickable
                    color={selectedGender === gender ? "primary" : "default"}
                    onClick={() => setSelectedGender(gender)}
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* ------------------ Pesos ------------------ */}
          <Box sx={{ width: "100%", mt: 2, p: 2, border: "2px solid #ccc", borderRadius: 2, position: "relative", backgroundColor: "#fff" }}>
            <Typography
              sx={{
                position: "absolute",
                top: -12,
                left: 20,
                backgroundColor: "#fff",
                px: 1,
                fontSize: 16,
                fontWeight: "bold",
                color: "#333",
              }}
            >
              Pesos
            </Typography>

            <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "center" }}>
              {pesos.map((option) => (
                <Chip
                  key={option.nombre}
                  label={option.min === 7 ? "Solo Barco" : `min ${option.min} - max ${option.max} Kg`}
                  sx={{ m: 0.5 }}
                  clickable
                  onClick={() => handleChipClickPeso(option.nombre)}
                  color={selectedPeso === option.nombre ? "primary" : "default"}
                />
              ))}
            </Box>
          </Box>

          {/* ------------------ Dimensiones (solo para algunos pesos) ------------------ */}
          {["Pesado", "Muy pesado", "Extremadamente pesado", "Solo Barco"].includes(selectedPeso) && (
            <Box sx={{ width: "100%", mt: 2, p: 2, border: "2px solid #ccc", borderRadius: 2, position: "relative", backgroundColor: "#fff" }}>
              <Typography
                sx={{
                  position: "absolute",
                  top: -12,
                  left: 20,
                  backgroundColor: "#fff",
                  px: 1,
                  fontSize: 16,
                  fontWeight: "bold",
                  color: "#333",
                }}
              >
                Dimensiones
              </Typography>

              <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "center" }}>
                {dimensiones.map((option) => (
                  <Chip
                    key={option.nombre}
                    label={`min ${option.min} - max ${option.max} cm³`}
                    sx={{ m: 0.5 }}
                    clickable
                    onClick={() => handleChipClickDimension(option.nombre)}
                    color={selectedDimension === option.nombre ? "primary" : "default"}
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* ------------------ Inputs principales ------------------ */}
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={12}>
              <TextField
                label="Titulo"
                variant="outlined"
                value={title}
                onChange={(e) => setTitle(capitalizeFirstLetter(e.target.value))}
                required
                fullWidth
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Precios"
                variant="outlined"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                fullWidth
                sx={{
                  "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button": {
                    WebkitAppearance: "none",
                    margin: 0,
                  },
                  "& input[type=number]": { MozAppearance: "textfield" },
                }}
              />
            </Grid>

            {/* stock solo si country !== China; aquí country es China, pero dejo el bloque por si lo cambias */}
            {country !== "China" && (
              <Grid item xs={12}>
                <TextField
                  label="Cantidad en Stock"
                  variant="outlined"
                  type="number"
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                  required
                  fullWidth
                />
              </Grid>
            )}

            <Grid item xs={12}>
              <TextField
                label="Detalles"
                variant="outlined"
                multiline
                rows={4}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                fullWidth
              />
            </Grid>

            {/* ------------------ Colores ------------------ */}
            <Grid item xs={12}>
              <Box sx={{ m: 1 }}>
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleAddChipColor}
                  placeholder="Introduzca Color"
                />
                <Box sx={{ mt: 1 }}>
                  {chipscolor.map((chip, index) => (
                    <Chip
                      key={index}
                      label={chip}
                      sx={{ m: 0.5 }}
                      onDelete={() => handleDeleteChipColor(chip)}
                    />
                  ))}
                </Box>
              </Box>

              {/* ------------------ Tallas ------------------ */}
              <Box sx={{ m: 1 }}>
                <Input
                  value={inputValues}
                  onChange={(e) => setInputValues(e.target.value)}
                  onKeyDown={handleAddChipTalla}
                  placeholder="Introduzca Estilo"
                />
                <Box sx={{ mt: 1 }}>
                  {chips.map((chip, index) => (
                    <Box key={index} display="flex" alignItems="center" marginY={1} gap={1}>
                      <Chip label={chip} sx={{ m: 0.5 }} onDelete={() => handleDeleteChipTalla(chip)} />
                      <TextField
                        label="Price"
                        type="number"
                        value={prices[chip] || ""}
                        onChange={(e) => handlePriceChanges(e, chip)}
                        sx={{
                          "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button": {
                            WebkitAppearance: "none",
                            margin: 0,
                          },
                          "& input[type=number]": { MozAppearance: "textfield" },
                        }}
                      />
                    </Box>
                  ))}
                </Box>
              </Box>
            </Grid>

            {/* ------------------ Publicar ------------------ */}
            <Grid item xs={12} display="flex" justifyContent="center" alignItems="center">
              <Button type="submit" variant="contained" color="primary">
                PUBLICAR PRODUCTO
              </Button>
            </Grid>
          </Grid>
        </Box>

        {/* ========================================================= */}
        {/* ✅ SECCIÓN NUEVA: IMÁGENES REALES (después de publicar)     */}
        {/* ========================================================= */}
        <Box sx={{ mt: 3, px: 2 }}>
          <Divider sx={{ my: 2 }} />

          <Box sx={{ p: 2, border: "1px solid #ddd", borderRadius: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Imágenes reales del producto (máx. {MAX_REAL_IMAGES})
            </Typography>

            <Typography variant="body2" sx={{ opacity: 0.8, mb: 1 }}>
              Código producto: <b>{codigoCreado || "Aún no publicado"}</b>
            </Typography>

            {realMsg && (
              <MUIAlert sx={{ mb: 2 }} severity={realMsg.startsWith("✅") ? "success" : "warning"}>
                {realMsg}
              </MUIAlert>
            )}

            <TextField
              label="Link del video (se guarda en campo id)"
              variant="outlined"
              value={videoLinkReal}
              onChange={(e) => setVideoLinkReal(e.target.value)}
              fullWidth
              placeholder="https://..."
              sx={{ mb: 2 }}
              disabled={!codigoCreado || savingReal || loading}
            />

            <Button variant="outlined" component="label" disabled={!codigoCreado || savingReal || loading}>
              Seleccionar imágenes reales
              <input type="file" hidden accept="image/*" multiple onChange={handleRealImagesUpload} />
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
                    <Button
                      size="small"
                      color="error"
                      onClick={() => handleRemoveRealImage(i)}
                      disabled={savingReal || loading}
                    >
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
              onClick={saveRealMedia}
              disabled={!codigoCreado || savingReal || loading}
              fullWidth
              sx={{ mt: 2 }}
            >
              {savingReal ? "Subiendo..." : "SUBIR IMÁGENES REALES"}
            </Button>
          </Box>
        </Box>
      </Box>
    </>
  );
};

export default Publicar;
