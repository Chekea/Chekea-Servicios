import React, { useState, useEffect } from "react";
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
  Snackbar,
  Alert,
} from "@mui/material";
import AddAPhotoIcon from "@mui/icons-material/AddAPhoto";
import {
  get,
  ref,
  getDatabase,
  push,
  set,
  query,
  orderByKey,
  startAt,
} from "firebase/database";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  addDoc,
  limit,
  getDoc,
  updateDoc,
  getDocs,
  where,
  deleteField,
} from "firebase/firestore";

import { capitalizeFirstLetter, compressImage } from "../ayuda";
import app from "./../Servicios/firebases";

import Cabezal from "./componentes/Cabezal";
import axios from "axios";
import * as XLSX from "xlsx";
import {
  getDownloadURL,
  getStorage,
  ref as storageref,
  uploadBytes,
} from "firebase/storage";
import { useLocation } from "react-router";
const categorias = [
  {
    nombre: "Moda & Accesorios",
    subcategorias: [
      "Trajes",
      "Faldas",
      "Vestidos",
      "Bolsos",
      "Pantalones",
      "Calzado",
      "Camisas",
      "Ropa Interior",
      "Accesorios",
    ],
  },
  {
    nombre: "Complementos para peques",
    subcategorias: [
      "Bebés",
      "Niños",
      "Juguetes",
      "Moda",
      "Carritos",
      "Mochilas",
      "Accesorios",
    ],
  },
  {
    nombre: "Deporte",
    subcategorias: ["Ropa", "Calzado", "Accesorios", "Gimnasio"],
  },
  {
    nombre: "Electrónica",
    subcategorias: [
      "Móviles",
      "Tablets",
      "Ordenadores",
      "Auriculares",
      "Televisores",
      "Cámaras",
      "Drones",
    ],
  },
  {
    nombre: "Belleza & Accesorios",
    subcategorias: [
      "Maquillaje",
      "Cabello",
      "Piel",
      "Uñas",
      "Cremas",
      "Cepillos",
      "Accesorios",
    ],
  },
  {
    nombre: "Hogar",
    subcategorias: [
      "Accesorios",
      "Cocina",
      "Baño",
      "Decoración",
      "Limpieza",
      "Jardín",
      "Iluminación",
    ],
  },
  {
    nombre: "Otros",
    subcategorias: [
      "Mascotas",
      "Viajes",
      "Oficina",
      "Arte",
      "Música",
      "Regalos",
      "Accesorios",
    ],
  },
];

const ImagePreview = ({ file, onRemove, index, sx }) => {
  const [src, setSrc] = useState("");

  useEffect(() => {
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setSrc(objectUrl);

      return () => {
        URL.revokeObjectURL(objectUrl);
      };
    }
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
            onClick={() => onRemove(file)}
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

const Publicar = () => {
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const location = useLocation();
  const userName = location.state?.userName || "";
  console.log(userName);

  const [cantidad, setCantidad] = useState("");
  const [dimension, setDimension] = useState("");
  const [peso, setpeso] = useState(0);

  const [ubicacion, setUbicacion] = useState("");
  const [loading, setLoading] = useState(false); // Loading state

  const [details, setDetails] = useState("");
  const [images, setImages] = useState([]);
  const [selectedChip, setSelectedChip] = useState("Aerea");
  const [selectedChip1, setSelectedChip1] = useState(null);
  const [selectedChip2, setSelectedChip2] = useState(null);
  const [chips, setChips] = useState([]);
  const [showbox, setShowBox] = useState(true);
  const [imgs, setimgs] = useState(null);
  const [selectedPeso, setSelectedPeso] = useState(null);
  const [selectedDimension, setSelectedDimension] = useState(null);
  const [selectedsubCategoria, setSelectedSubCategoria] = useState(null);
  const [selectedCategoria, setSelectedCategoria] = useState(null);
  const [selectedGender, setSelectedGender] = useState(null);

  const MARGEN = (preciobase) => {
    if (preciobase <= 7000) {
      return preciobase * 1.3 + 1500;
    } else if (preciobase <= 25000) {
      return preciobase * 1.22 + 1000;
    } else if (preciobase <= 250000) {
      return preciobase * 1.15;
    } else if (preciobase <= 500000) {
      return preciobase * 1.12;
    } else {
      return preciobase * 1.08 + 100000;
    }
  };

  let categ = "Moda & Accesorios"; //Categoria
  let country = "China";

  const pesos = [
    { nombre: "Ultraligero", min: 0.1, max: 0.5 },
    { nombre: "Ligero", min: 0.51, max: 1.1 },
    { nombre: "Medio", min: 1.2, max: 2.0 },
    { nombre: "Pesado", min: 2.01, max: 3.5 },
    { nombre: "Muy pesado", min: 3.51, max: 4.5 },
    { nombre: "Extremadamente pesado", min: 4.51, max: 6.0 },
    { nombre: "Solo Barco", min: 7, max: 7 },
  ];
  const subCategorias = [
    { nombre: "Trajes", estimacion: { min: 0.8, max: 1.4 } },
    { nombre: "Vestidos", estimacion: { min: 0.5, max: 1.0 } },
    { nombre: "Camisas", estimacion: { min: 0.2, max: 0.5 } },
    { nombre: "Bolsos", estimacion: { min: 0.3, max: 0.9 } },
    { nombre: "Calzado", estimacion: { min: 0.6, max: 1.2 } },
    { nombre: "Faldas", estimacion: { min: 0.3, max: 0.7 } },
    { nombre: "Pantalones", estimacion: { min: 0.3, max: 0.7 } },
    { nombre: "Otros", estimacion: { min: 0.3, max: 0.7 } },
    { nombre: "Ropa Interior", estimacion: { min: 0.3, max: 0.7 } },
  ];

  function getCategoriasPorUsuario(username) {
    const user = username.trim().toLowerCase();

    const permisos = {
      "01": ["Moda & Accesorios", "Complementos para peques"],
      1: ["Belleza & Accesorios", "Deporte"],
      "001": ["Hogar", "Otros"],

      admin: ["Electrónica", "Hogar"],
    };

    // Si el usuario tiene permisos definidos
    if (permisos[user]) {
      return categorias.filter((cat) => permisos[user].includes(cat.nombre));
    }

    // Si el usuario no tiene permisos → devolver vacío o todo
    return [];
  }
  // ROPA Y ACCESORIOS

  console.log("eiby bielo");

  const dimensiones = [
    { nombre: "Paquete pequeño", min: 0.023, max: 0.03 },
    { nombre: "Tamaño personal", min: 0.031, max: 0.15 },
    { nombre: "Paquete mediano", min: 0.151, max: 0.4 },
    { nombre: "Paquete grande", min: 0.401, max: 0.8 },
    { nombre: "Caja estándar", min: 0.801, max: 1.2 },
    { nombre: "Caja extra grande", min: 1.201, max: 1.8 },
    { nombre: "Carga pesada", min: 1.801, max: 2.2 },
    { nombre: "Carga industrial", min: 2.201, max: 3.0 },
  ];

  const [chipOptions, setchipOptions] = useState([]);
  const [chipOptionscat, setchipOptionscat] = useState([]);
  console.log(categ);
  const [chipscolor, setChipscolor] = useState([]);
  const [prices, setPrices] = useState({});
  const [inputValue, setInputValue] = useState("");
  const [inputValues, setInputValues] = useState("");
  const [view, setView] = useState("");
  const database = getDatabase(app);
  const db = getFirestore(app);

  let maysaID = "y7eJBoQ23feGEF3HAF2sZxpDKig1";

  const storage = getStorage(app);
  const handleCategoriaClick = (nombre) => {
    setSelectedCategoria((prev) => (prev === nombre ? null : nombre));
    console.log(selectedsubCategoria, "heis");
    setSelectedSubCategoria(null); // ✅ Limpia la subcategoría al cambiar
  };

  const categoriaSeleccionada = categorias.find(
    (cat) => cat.nombre === selectedCategoria
  );

  const handleTitleChange = (e) =>
    setTitle(capitalizeFirstLetter(e.target.value));
  const handlePriceChange = (e) => setPrice(e.target.value);

  const handleCantidad = (e) => setCantidad(e.target.value);

  const handleDetailsChange = (e) => setDetails(e.target.value);

  const dbRealtime = getDatabase(app);
  const dbFirestore = getFirestore(app);

  const handleChipClickPeso = (peso) => {
    // Si el chip ya está seleccionado, lo deselecciona
    setSelectedPeso((prev) => (prev === peso ? null : peso)); // Si clicas la misma, se oculta
  };
  const handleChipClickCategoria = (peso) => {
    // Si el chip ya está seleccionado, lo deselecciona
    setSelectedSubCategoria((prev) => (prev === peso ? null : peso)); // Si clicas la misma, se oculta
  };

  const handleChipClickDimension = (dimension) => {
    // Si el chip ya está seleccionado, lo deselecciona
    if (selectedPeso === dimension) {
      setSelectedDimension(null);
    } else {
      setSelectedDimension(dimension);
    }
  };

  // 👉 Tu array de códigos a migrar
  const codigosArray = [, "-OH1eDCOAABkZleBX2aM"];

  async function migrateProductsFromArray() {
    try {
      for (const codigo of codigosArray) {
        console.log(`🔍 Revisando producto: ${codigo}`);

        // 📌 Verificar si ya existe en Firestore
        const productoRef = doc(dbFirestore, "productos", codigo);
        const productoSnap = await getDoc(productoRef);

        if (productoSnap.exists()) {
          console.log(`⏩ Producto ${codigo} ya migrado. Se omite.`);
          continue;
        }

        // 📌 Obtener producto desde RTDB
        const productoRefRTDB = ref(dbRealtime, `/GE/Exterior/Prod/${codigo}`);
        const snapshot = await get(productoRefRTDB);

        if (!snapshot.exists()) {
          console.log(`⚠️ Producto ${codigo} no encontrado en RTDB.`);
          continue;
        }

        const producto = snapshot.val();

        console.log(`📦 Migrando producto: ${codigo}`);

        // Datos principales (sin imágenes, tallas, colores)
        const { Imagenes, Talla, Color, ...rest } = producto;

        // ➕ Añadir campo "origen: China"
        const productoData = {
          ...rest,
          origen: "China",
        };

        // Guardar producto base en Firestore
        await setDoc(productoRef, productoData);

        // 3️⃣ Subcolección de imágenes
        if (Imagenes) {
          for (const [imgId, imgData] of Object.entries(Imagenes)) {
            const imgRef = doc(collection(productoRef, "imagenes"), imgId);
            await setDoc(imgRef, imgData);
          }
        }

        // 4️⃣ Subcolección de tallas
        if (Talla) {
          for (const [tallaId, tallaData] of Object.entries(Talla)) {
            const tallaRef = doc(collection(productoRef, "tallas"), tallaId);
            await setDoc(tallaRef, tallaData);
          }
        }

        // 5️⃣ Subcolección de colores
        if (Color) {
          for (const [colorId, colorData] of Object.entries(Color)) {
            const colorRef = doc(collection(productoRef, "colores"), colorId);
            await setDoc(colorRef, colorData);
          }
        }

        console.log(`✅ Producto ${codigo} migrado con éxito.`);
      }

      console.log("🎉 Migración finalizada para todos los códigos del array.");
    } catch (error) {
      console.error("❌ Error migrando productos:", error);
    }
  }

  async function verificarProductos() {
    try {
      // 1️⃣ Query: leer desde un producto específico en adelante
      const productosQuery = ref(dbRealtime, "/GE/Exterior/Prod");

      const snapshot = await get(productosQuery);

      if (!snapshot.exists()) {
        console.log("No se encontraron productos en RTDB desde");
        return;
      }

      const productos = snapshot.val();

      // Arrays de control
      const yaMigrados = [];
      const noMigrados = [];

      // 2️⃣ Recorrer productos
      for (const [codigo] of Object.entries(productos)) {
        console.log(`🔍 Verificando producto: ${codigo}`);

        const productoRef = doc(dbFirestore, "productos", codigo);
        const productoSnap = await getDoc(productoRef);

        if (productoSnap.exists()) {
          yaMigrados.push(codigo);
        } else {
          noMigrados.push(codigo);
        }
      }

      // 📊 Mostrar resultado
      console.log("✅ Verificación completada.");
      console.log("Productos YA en Firestore:", yaMigrados);
      console.log("Productos que NO están en Firestore:", noMigrados);

      return { yaMigrados, noMigrados };
    } catch (error) {
      console.error("❌ Error verificando productos:", error);
    }
  }

  const migrateGEInfoToFirestore = async () => {
    try {
      const dbRealtime = getDatabase(); // Realtime Database
      const firestore = getFirestore(); // Firestore

      const infoRef = ref(dbRealtime, "/GE/Info");
      const snapshot = await get(infoRef);

      if (!snapshot.exists()) {
        console.log("No hay datos en /GE/Info");
        return;
      }

      const data = snapshot.val();

      // Iterar sobre cada nodo de /GE/Info
      for (const key in data) {
        if (data.hasOwnProperty(key)) {
          const value = data[key];

          // Solo migrar valores exactos: string, number o boolean
          if (
            typeof value === "string" ||
            typeof value === "number" ||
            typeof value === "boolean"
          ) {
            // Guardar en Firestore como documento separado
            await setDoc(doc(firestore, "GE_Info", key), { value });
            console.log(`Migrado: ${key} → ${value}`);
          } else {
            console.log(`Omitido ${key}, contiene valores anidados`);
          }
        }
      }

      console.log("Migración completada ✅");
    } catch (error) {
      console.error("Error migrando datos:", error);
    }
  };

  const subirDatoConID = async () => {
    try {
      // Crear referencia de documento con ID automático
      const docRef = doc(collection(db, "usuarios"));
      const id = docRef.id; // Obtener ID generado

      // Subir el objeto con el ID incluido
      await setDoc(docRef, {
        id: id,
        man: "eie",
        nombre: "eiby",
      });

      console.log("Documento subido con ID ✅", id);
    } catch (error) {
      console.error("Error al subir el documento ❌", error);
    }
  };

  const handleImageUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length + images.length > 9)
      return alert("You can upload up to 9 images only.");

    try {
      const compressedFiles = await Promise.all(
        files.map(async (file) => {
          console.log(
            `Original: ${file.name}, ${(file.size / 1024).toFixed(2)} KB`
          );
          const compressedFile = await compressImage(file);
          console.log(
            `Compressed: ${compressedFile.name}, ${(
              compressedFile.size / 1024
            ).toFixed(2)} KB`
          );
          return compressedFile;
        })
      );

      setImages((prevImages) => [...prevImages, ...compressedFiles]);
    } catch (error) {
      console.error("Image compression failed:", error);
    }
  };
  const handleRemoveImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };
  const getCurrentTimeInMilliseconds = () => {
    return Date.now();
  };

  function normalizarTexto(texto) {
    return texto
      .toLowerCase()
      .normalize("NFD") // descompone caracteres acentuados
      .replace(/[\u0300-\u036f]/g, "") // elimina acentos
      .replace(/[^\w\s]/gi, ""); // elimina caracteres especiales
  }

  // Prepare the common data object with the provided information
  const prepareCommonData = async (codigo, fecha) => {
    const titulonormalizado = normalizarTexto(title);
    const tokens = titulonormalizado
      .toLowerCase()
      .split(" ")
      .filter((word) => word.length >= 4) // palabras con 4 o más letras
      .slice(0, 6); // máximo 6 palabras

    const data = {
      Titulo: title,
      Ttoken: tokens,
      Categoria: selectedCategoria,
      Subcategoria: selectedsubCategoria, // Baño
      Codigo: codigo,
      Precio: parseInt(MARGEN(price)),
      Peso: selectedPeso,
      Dimension: selectedDimension || "Paquete mediano",
      Detalles: details,
      Vistos: 0,
      Vendedor: userName,
      // Compras: 0,
      Fecha: fecha,
      // Descuento: 0,
      Pais: country,
    };

    // 📌 Solo agregar Stock si el país es "Guinea ecuatorial"
    if (country === "Guinea ecuatorial") {
      data.Stock = parseInt(cantidad);
    }
    if (selectedsubCategoria == "Moda & Accesorios") {
      data.Genero = selectedGender;
    }

    return data;
  };

  async function actualizarTokens() {
    try {
      const productosRef = collection(db, "productos");

      const q = query(productosRef); // ✅ consulta con limit

      const snapshot = await getDocs(q); // ✅ esto devuelve QuerySnapshot

      if (!snapshot.empty) {
        let actualizados = 0;

        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();

          if (
            data.Ttoken &&
            Array.isArray(data.Ttoken) &&
            data.Ttoken.length > 0
          ) {
            continue;
          }

          const titulo = data.Titulo;
          const tituloNormalizado = normalizarTexto(titulo);

          const tokens = tituloNormalizado
            .split(" ")
            .filter((word) => word.length >= 4)
            .slice(0, 5);

          await updateDoc(doc(db, "productos", docSnap.id), {
            Ttoken: tokens,
          });

          console.log(`Producto ${docSnap.id} actualizado:`, tokens);
          actualizados++;
        }

        console.log(
          `Proceso terminado. Productos actualizados: ${actualizados}`
        );
      } else {
        console.log("No se encontraron productos.");
      }
    } catch (error) {
      console.error("Error actualizando productos:", error);
    }
  }

  async function eliminarCamposConUbicacion() {
    try {
      const productosRef = collection(db, "productos");

      // 🔹 Buscar solo los productos que tienen "Ubicacion"
      const q = query(productosRef, where("Condicion", "!=", ""));

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        console.log("No se encontraron productos con Ubicacion.");
        return;
      }

      let eliminados = 0;

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();

        // Solo si realmente tienen alguno de esos campos
        const camposAEliminar = {};
        let tieneCampo = false;

        [
          "Envio",
          "Ubicacion",
          "Duracion",
          "Condicion",
          "Tipo",
          "origen",
        ].forEach((campo) => {
          if (data[campo] !== undefined) {
            camposAEliminar[campo] = deleteField();
            tieneCampo = true;
          }
        });

        if (tieneCampo) {
          await updateDoc(doc(db, "productos", docSnap.id), camposAEliminar);
          console.log(`🧹 Campos eliminados en producto ${docSnap.id}`);
          eliminados++;
        }
      }

      console.log(
        `✅ Proceso completado: ${eliminados} productos actualizados.`
      );
    } catch (error) {
      console.error("❌ Error eliminando campos:", error);
    }
  }

  async function actualizarContador(username) {
    try {
      // 🔹 Mapa para relacionar usuario con su campo
      const userMap = {
        1: "Asly",
        "01": "Maysa",
        "001": "Vicky",
      };

      const nombreCampo = userMap[username];
      if (!nombreCampo) {
        console.log("Usuario no válido");
        return;
      }

      // 🔹 Referencia al documento en Firestore
      const ref = doc(db, "GE_Info", "Nombres");

      // 🔹 Obtener el documento actual
      const snapshot = await getDoc(ref);
      if (snapshot.exists()) {
        const data = snapshot.data();
        const valorActual = data[nombreCampo] || 0;

        // 🔹 Incrementar el valor
        const nuevoValor = valorActual + 1;

        // 🔹 Subir el nuevo valor
        await updateDoc(ref, { [nombreCampo]: nuevoValor });

        console.log(`✅ ${nombreCampo} actualizado a ${nuevoValor}`);
      } else {
        console.log("El documento 'Nombres' no existe.");
      }
    } catch (error) {
      console.error("❌ Error al actualizar contador:", error);
    }
  }

  async function moverImagenPrincipal() {
    try {
      const productosRef = collection(db, "productos");

      // 🔹 Buscar solo los productos que tienen "imagenPrincipal"
      const q = query(productosRef, where("ImagenPrincipal", "!=", null));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        console.log("No se encontraron productos con imagenPrincipal.");
        return;
      }

      let actualizados = 0;

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();

        // Solo actuar si realmente tiene el campo
        if (data.ImagenPrincipal !== undefined) {
          await updateDoc(doc(db, "productos", docSnap.id), {
            Imagen: data.ImagenPrincipal, // copiar valor
            ImagenPrincipal: deleteField(), // eliminar campo original
          });

          console.log(`📸 Imagen movida en producto ${docSnap.id}`);
          actualizados++;
        }
      }

      console.log(
        `✅ Proceso completado: ${actualizados} productos actualizados.`
      );
    } catch (error) {
      console.error("❌ Error moviendo imagenPrincipal:", error);
    }
  }

  // useEffect(() => {
  //   moverImagenPrincipal();
  // }, []); // solo se ejecuta una vez
  // Upload images to Firebase Storage and get their URLs
  const uploadImagesToStorage = async (imageFiles) => {
    const imageUrls = [];
    try {
      for (let i = 0; i < imageFiles.length; i++) {
        const imageFile = imageFiles[i];

        // Log image file properties to make sure it's a valid Blob
        console.log(imageFile, imageFile.type);

        // Generate a unique reference for the image in Firebase Storage
        const imageRef = storageref(
          storage,
          `Imagenes/Productos/${getCurrentTimeInMilliseconds()}.jpeg`
        );

        // Upload the image (Blob) to Firebase Storage
        await uploadBytes(imageRef, imageFile);

        // Get the download URL for the uploaded image
        const imageUrl = await getDownloadURL(imageRef);

        // Push the URL to the imageUrls array
        imageUrls.push(imageUrl);
      }
    } catch (error) {
      console.error("Error uploading images: ", error);
    }
    return imageUrls;
  };
  // Función para separar las imágenes en principal, real, paquete y extras
  const separateImages = (imageUrls) => {
    if (imageUrls.length < 3)
      throw new Error("Se necesitan al menos 3 imágenes.");

    const principal = imageUrls[0];
    // const real = imageUrls[imageUrls.length - 2];
    // const paquete = imageUrls[imageUrls.length - 1];

    // Todas las demás imágenes excluyendo principal, real y paquete
    const extraImages = imageUrls.slice(1);

    return { principal, extraImages };
  };

  // Crear subcolección de colores
  const createColorsNode = async (codigo, chipscolor) => {
    const colorsNode = [];
    for (const color of chipscolor) {
      const colorId = doc(collection(db, `productos/${codigo}/colores`)).id;
      const colorData = { id: colorId, label: color };
      colorsNode.push(colorData);

      // Guardar en subcolección
      await setDoc(
        doc(db, `productos/${codigo}/colores/${colorId}`),
        colorData
      );

      // Guardar en filtros para consultas rápidas
      // await setDoc(doc(db, `filtros/color/${color}/${codigo}`), { codigo });
    }
    return colorsNode;
  };

  console.log("HOALA MUDNO CRUEL");

  // Crear subcolección de tallas
  const createSizesNode = async (codigo, chips, prices) => {
    const sizesNode = [];

    for (const size of chips) {
      const sizeId = doc(collection(db, `productos/${codigo}/tallas`)).id;
      const sizeData = {
        id: sizeId,
        label: size,
        precio: prices[size] > 0 ? parseInt(MARGEN(prices[size])) : 0,
      };
      sizesNode.push(sizeData);

      // Guardar en subcolección
      await setDoc(doc(db, `productos/${codigo}/tallas/${sizeId}`), sizeData);

      // Guardar en filtros para consultas rápidas
      // await setDoc(doc(db, `filtros/talla/${size}/${codigo}`), { codigo });
    }
    return sizesNode;
  };

  // Subir imágenes extras a subcolección
  const uploadExtraImages = async (codigo, extraImages) => {
    for (const url of extraImages) {
      const imgId = doc(collection(db, `productos/${codigo}/imagenesExtra`)).id;
      await setDoc(doc(db, `productos/${codigo}/imagenesExtra/${imgId}`), {
        id: imgId,
        url,
      });
    }
  };

  // Función principal para manejar el submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validación mínima de imágenes
      if (images.length < 3) {
        throw new Error(
          "Cuidado!!!, Se necesitan al menos 3 imágenes para continuar."
        );
      }
      if (!selectedsubCategoria) {
        throw new Error("Cuidado!!!, no haz seleccionado la subcategorias");
      }

      // Validación de peso
      if (!selectedPeso) {
        throw new Error("Cuidado!!!, no haz seleccionado un peso.");
      }
      if (
        (!chipscolor || chipscolor.length === 0) &&
        (!chips || chips.length === 0)
      ) {
        throw new Error(
          "Cuidado!!!, debes agregar al menos un color o un estilo para continuar."
        );
      }
      // Crear referencia de producto
      const newItemRef = doc(collection(db, "productos"));
      const codigo = newItemRef.id;

      // Datos comunes del producto
      const fecha = getCurrentTimeInMilliseconds();
      let commonData = await prepareCommonData(codigo, fecha);

      // Subir todas las imágenes a Storage y obtener URLs
      const imageUrls = await uploadImagesToStorage(images);

      // Separar imágenes
      const { principal, real, paquete, extraImages } =
        separateImages(imageUrls);

      // Guardar imágenes especiales en el documento principal
      commonData.Imagen = principal;
      // commonData.RealImage = real;
      // commonData.PaqueteImage = paquete;

      // Guardar producto principal
      await setDoc(newItemRef, commonData);

      // Guardar imágenes extra en subcolección
      if (extraImages.length > 0) {
        await uploadExtraImages(codigo, extraImages);
      }

      // Guardar colores y tallas
      if (chipscolor.length > 0) await createColorsNode(codigo, chipscolor);
      if (chips.length > 0) await createSizesNode(codigo, chips, prices);

      await actualizarContador(userName);

      // Reset de estados
      setLoading(false);
      setImages([]);
      setChipscolor([]);
      setChips([]);
      setTitle("");
      setDetails("");
      setPrice("");
      console.log(commonData);

      alert("Producto subido correctamente!");
    } catch (error) {
      setLoading(false);
      console.error("Error al subir el producto:", error);
      alert("ERROR INESPERADO: " + error.message);
    }
  };

  //hola mundo cruel
  console.log("hola mundo cruel");

  // Store data in the 'filtros' node
  const storeInFiltrosNode = async (codigo, commonData) => {
    const filtrosRef = ref(database, `GE/Filtros/Nacional/${categ}/${codigo}`);
    await set(filtrosRef, {
      Categoria: commonData.Categoria,
      Subcategoria: commonData.Subcategoria,
      Precio: commonData.Precio,
      Stock: commonData.Stock,
      Imagen: commonData.Imagen,

      Titulo: commonData.Titulo,
      Codigo: commonData.Codigo,
    });

    // Optionally, store the images URLs in the 'filtros' node as well if needed
  };

  const handleInputChange = (e) => setInputValue(e.target.value);
  const handleInputChangeStilo = (e) => setInputValues(e.target.value);

  const handleAddChip = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (inputValue.trim()) {
        setChipscolor([
          ...chipscolor,
          capitalizeFirstLetter(inputValue.trim()),
        ]);
        setInputValue("");
      }
    }
  };
  const handleAddChips = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (inputValues.trim()) {
        setChips([...chips, capitalizeFirstLetter(inputValues.trim())]);
        setPrices({
          ...prices,
          [capitalizeFirstLetter(inputValues.trim())]: "",
        });
        setInputValues("");
      }
    }
  };

  const handleDeleteChip = (chipToDelete) => {
    setChipscolor(chipscolor.filter((chip) => chip !== chipToDelete));
  };

  const handleChipClick = (chipValue) => {
    console.log(chipValue);
    if (chipValue !== selectedChip) {
      setSelectedChip(chipValue);

      // fetchData(chipValue);
    }
  };
  const handleChipClick1 = (chipValue) => {
    if (chipValue !== selectedChip1) {
      setSelectedChip2(null);
      setSelectedChip1(chipValue);
      console.log(chipValue);

      // fetchData(chipValue);
    }
  };
  const handleChipClick2 = (chipValue) => {
    setSelectedChip2(chipValue);
  };

  //it is what it is

  const handleDeleteChips = (chipToDelete) => {
    console.log("wettin");
    setChips(chips.filter((chip) => chip !== chipToDelete));
    const updatedPrices = { ...prices };
    delete updatedPrices[chipToDelete];
    setPrices(updatedPrices);
  };

  const handlePriceChanges = (e, chipName) => {
    setPrices({ ...prices, [chipName]: e.target.value });
  };

  // Función para leer el archivo Excel y convertirlo en JSON
  const [data, setData] = useState([]); // Estado para guardar los datos procesados

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
      <Box
        sx={{
          paddingTop: { xs: 10, sm: 20 }, // para que no quede pegado arriba
        }}
      >
        <Cabezal texto={"Publicar Prod"} />
        <Grid item xs={12}>
          <Typography variant="subtitle1" gutterBottom>
            Minimo 4 Imagenes (Max 9)
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
            {images.map((file, index) => {
              const isLast = index === images.length - 1;
              const isSecondLast = index === images.length - 2;

              return (
                <Box key={index}>
                  <ImagePreview
                    file={file}
                    sx={{ border: isLast ? "2px solid red" : "none" }}
                    onRemove={() => handleRemoveImage(index)}
                    index={index}
                  />
                </Box>
              );
            })}
          </Box>
        </Grid>
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{ padding: 2, paddingTop: 8 }}
        >
          <div style={{ width: "100%", padding: 20 }}>
            <h2 style={{ textAlign: "center" }}>Categorías</h2>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                marginBottom: 20,
              }}
            >
              {getCategoriasPorUsuario(userName).map((cat) => (
                <Chip
                  key={cat.nombre}
                  label={cat.nombre}
                  clickable
                  onClick={() => handleCategoriaClick(cat.nombre)}
                  color={
                    selectedCategoria === cat.nombre ? "primary" : "default"
                  }
                  style={{ margin: 5, fontSize: 14 }}
                />
              ))}
            </div>

            {categoriaSeleccionada && (
              <div
                style={{
                  width: "100%",
                  margin: 10,
                  padding: 20,
                  border: "2px solid #ccc",
                  borderRadius: 10,
                  position: "relative",
                  boxSizing: "border-box",
                  backgroundColor: "#fff",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: -12,
                    left: 20,
                    backgroundColor: "#fff",
                    padding: "0 8px",
                    fontSize: 16,
                    fontWeight: "bold",
                    color: "#333",
                  }}
                >
                  Subcategorías de {categoriaSeleccionada.nombre}
                </span>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "center",
                    width: "100%",
                  }}
                >
                  {categoriaSeleccionada.subcategorias.map((sub) => (
                    <Chip
                      key={sub}
                      label={sub}
                      style={{ margin: 5 }}
                      onClick={() => handleChipClickCategoria(sub)}
                      color={
                        selectedsubCategoria === sub ? "primary" : "default"
                      }
                      clickable
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {categoriaSeleccionada?.nombre === "Moda & Accesorios" && (
            <div
              style={{
                width: "100%",
                margin: 10,
                padding: 20,
                border: "2px solid #ccc",
                borderRadius: 10,
                position: "relative",
                boxSizing: "border-box",
                backgroundColor: "#fff",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: -12,
                  left: 20,
                  backgroundColor: "#fff",
                  padding: "0 8px",
                  fontSize: 16,
                  fontWeight: "bold",
                  color: "#333",
                }}
              >
                Género
              </span>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  width: "100%",
                }}
              >
                {["Femenina", "Masculina"].map((gender) => (
                  <Chip
                    key={gender}
                    label={gender}
                    style={{ margin: 5 }}
                    clickable
                    color={selectedGender === gender ? "primary" : "default"}
                    onClick={() => setSelectedGender(gender)}
                  />
                ))}
              </div>
            </div>
          )}
          <div
            style={{
              width: "100%",
              margin: 10,
              padding: 20,
              border: "2px solid #ccc",
              borderRadius: 10,
              position: "relative",
              boxSizing: "border-box",
              backgroundColor: "#fff",
            }}
          >
            <span
              style={{
                position: "absolute",
                top: -12,
                left: 20,
                backgroundColor: "#fff",
                padding: "0 8px",
                fontSize: 16,
                fontWeight: "bold",
                color: "#333",
              }}
            >
              Pesos
            </span>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                width: "100%",
              }}
            >
              {pesos.map((option) => (
                <Chip
                  key={option.nombre}
                  label={
                    option.min == 7
                      ? "Solo Barco"
                      : `min ${option.min} - max ${option.max} Kg`
                  }
                  style={{ margin: 5 }}
                  clickable
                  onClick={() => handleChipClickPeso(option.nombre)}
                  color={selectedPeso === option.nombre ? "primary" : "default"}
                />
              ))}
            </div>
          </div>
          {[
            "Pesado",
            "Muy pesado",
            "Extremadamente pesado",
            "Solo Barco",
          ].includes(selectedPeso) && (
            <div
              style={{
                width: "100%",
                margin: 10,
                padding: 20,
                border: "2px solid #ccc",
                borderRadius: 10,
                position: "relative",
                boxSizing: "border-box",
                backgroundColor: "#fff",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: -12,
                  left: 20,
                  backgroundColor: "#fff",
                  padding: "0 8px",
                  fontSize: 16,
                  fontWeight: "bold",
                  color: "#333",
                }}
              >
                Dimensiones
              </span>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  width: "100%",
                }}
              >
                {dimensiones.map((option) => (
                  <Chip
                    key={option.nombre}
                    label={`min ${option.min} - max ${option.max} cm³`}
                    style={{ margin: 5 }}
                    clickable
                    onClick={() => handleChipClickDimension(option.nombre)}
                    color={
                      selectedDimension === option.nombre
                        ? "primary"
                        : "default"
                    }
                  />
                ))}
              </div>
            </div>
          )}

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Titulo"
                variant="outlined"
                value={title}
                onChange={handleTitleChange}
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
                onChange={handlePriceChange}
                required
                fullWidth
                sx={{
                  "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button":
                    {
                      WebkitAppearance: "none",
                      margin: 0,
                    },
                  "& input[type=number]": {
                    MozAppearance: "textfield",
                  },
                }}
              />
            </Grid>

            {country !== "China" && (
              <Grid item xs={12}>
                <TextField
                  label={`Cantidad en Stock `}
                  variant="outlined"
                  type="number"
                  value={cantidad}
                  onChange={handleCantidad}
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
                onChange={handleDetailsChange}
                fullWidth
              />
            </Grid>
            <Grid item xs={12}>
              <div style={{ margin: 10 }}>
                <Input
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyDown={handleAddChip}
                  placeholder="Introduzca Color"
                />
                {chipscolor.map((chip, index) => (
                  <Chip
                    key={index}
                    label={chip}
                    style={{ margin: 3 }}
                    onDelete={() => handleDeleteChip(chip)}
                  />
                ))}
              </div>
              <div style={{ margin: 10 }}>
                <Input
                  value={inputValues}
                  onChange={handleInputChangeStilo}
                  onKeyDown={handleAddChips}
                  placeholder="Introduzca Estilo"
                />
                {chips.map((chip, index) => (
                  <Box
                    key={index}
                    display="flex"
                    alignItems="center"
                    marginY={1}
                  >
                    <Chip
                      label={chip}
                      style={{ margin: 3 }}
                      onDelete={() => handleDeleteChips(chip)}
                    />
                    <TextField
                      label="Price"
                      type="number"
                      value={prices[chip] || ""}
                      onChange={(e) => handlePriceChanges(e, chip)}
                      sx={{
                        "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button":
                          {
                            WebkitAppearance: "none",
                            margin: 0,
                          },
                        "& input[type=number]": {
                          MozAppearance: "textfield",
                        },
                      }}
                    />
                  </Box>
                ))}
              </div>
            </Grid>

            <Grid
              item
              xs={12}
              display="flex"
              justifyContent="center"
              alignItems="center"
            >
              <Button type="submit" variant="contained" color="primary">
                PUBLICAR PRODUCTO
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </>
  );
};

export default Publicar;
