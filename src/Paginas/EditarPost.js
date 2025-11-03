import React, { useState, useEffect } from "react";
import {
  Box,
  IconButton,
  Chip,
  Input,
  Drawer,
  TextField,
  Typography,
  Button,
  Grid,
  CircularProgress,
  FormControlLabel,
  Switch,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useMediaQuery,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import {
  get,
  ref,
  remove,
  getDatabase,
  push,
  set,
  update,
  onValue,
  query,
  equalTo,
  orderByChild,
} from "firebase/database";
import { getStorage, ref as storageRef, deleteObject } from "firebase/storage";
import { getAuth } from "firebase/auth";
import {
  doc,
  collection,
  getDocs,
  onSnapshot,
  getFirestore,
  getDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  setDoc,
} from "firebase/firestore";

import app from "./../Servicios/firebases";
import { useNavigate, useParams } from "react-router";
import Cabezal from "./componentes/Cabezal";
import Alert from "./componentes/Alert";

const AlertComponent = ({ isOpen, onClose, onConfirm }) => {
  const [inputValue, setInputValue] = useState("");

  const handleConfirm = () => {
    if (inputValue < 90) {
      onConfirm(inputValue);
    } else {
      alert("Ha ocurido un error");
    }
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
const EditarPost = () => {
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [dimension, setDimension] = useState("");
  const [espacio, setEspacio] = useState("");
  const [data, setData] = useState(null);

  const [cantidad, setCantidad] = useState("");
  const [stock, setStock] = useState(false);

  const [ubicacion, setUbicacion] = useState("");
  const [loading, setLoading] = useState(false); // Loading state

  const [details, setDetails] = useState("");
  const [images, setImages] = useState([]);
  const [selectedChip, setSelectedChip] = useState("Aerea");
  const [chipData, setChipData] = useState([]);
  const [showbox, setShowBox] = useState(true);

  const [chipscolor, setChipscolor] = useState([]);
  const [chipscoloradd, setChipscoloradd] = useState([]);

  const [chips, setChips] = useState([]);
  const [chipsnew, setChipsnew] = useState([]);

  const [prices, setPrices] = useState({});
  const [inputValue, setInputValue] = useState("");
  const [inputValues, setInputValues] = useState("");
  const [view, setView] = useState("");
  const database = getDatabase(app);
  const theme = useTheme();

  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { codigo, contexto } = useParams(); // Access the URL parameter
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [tovalue, setToValue] = useState(false);
  const [todelete, setToDelete] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerType, setDrawerType] = useState("color"); // "color" o "talla"
  const [dataChip, setDataChip] = useState(null); // chip que estamos editando
  const [newColor, setNewColor] = useState(""); // título del chip
  const [newPrice, setNewPrice] = useState(""); // precio (solo para talla)

  const navigate = useNavigate();
  const db = getFirestore(app);

  const handleDrawerOpen = (type, chip = null) => {
    setDrawerType(type);
    setDataChip(chip);

    if (chip) {
      // si es un chip de tipo "talla" con precio
      console.log(chip.precio, "hoal");
      if (type === "talla") {
        setNewColor(chip.label ?? "");
        setNewPrice(chip.precio ?? 0);
      } else {
        setNewColor(chip.label ?? "");
        setNewPrice("");
      }
    } else {
      // si vamos a agregar un chip nuevo
      setNewColor("");
      setNewPrice("");
    }

    setDrawerOpen(true);
  };

  const handleDrawerClose = () => setDrawerOpen(false);
  const MARGEN = (preciobase) => {
    if (preciobase <= 7000) {
      return preciobase > 0 ? preciobase * 1.3 + 1500 : 0;
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
  const handleSaveNew = async () => {
    if (!newColor) return;
    const productoRef = doc(db, "productos", codigo);

    if (drawerType === "color") {
      if (dataChip) {
        // Editar color existente
        setChipscolor((prev) =>
          prev.map((c) =>
            c.id === dataChip.id ? { ...c, label: newColor } : c
          )
        );

        const colorRef = doc(collection(productoRef, "colores"), dataChip.id);
        await updateDoc(colorRef, { label: newColor });
        console.log("Color editado:", newColor);
      } else {
        // Crear nuevo color con ID dentro del documento
        const newDocRef = doc(collection(productoRef, "colores")); // genera ID
        const newColorObj = {
          id: newDocRef.id,
          label: newColor,
        };

        // Guardar documento en Firestore
        await setDoc(newDocRef, newColorObj);

        // Actualizar estado local
        setChipscolor((prev) => [...prev, newColorObj]);
        console.log("Color nuevo guardado:", newColorObj);
      }
    } else {
      // Manejo de tallas
      let precios = parseInt(MARGEN(newPrice));
      const chipObj = { label: newColor, precio: precios || 0 };
      if (dataChip) {
        // Editar talla existente
        setChips((prev) =>
          prev.map((c) =>
            c.id === dataChip.id
              ? { ...c, label: newColor, precio: precios }
              : c
          )
        );

        const tallaRef = doc(collection(productoRef, "tallas"), dataChip.id);
        // await updateDoc(tallaRef, chipObj);
        console.log("Talla editada:", chipObj);
      } else {
        // Crear nueva talla
        const newTallaRef = doc(collection(productoRef, "tallas")); // genera ID
        const newTallaObj = { id: newTallaRef.id, ...chipObj };

        await setDoc(newTallaRef, newTallaObj);
        setChips((prev) => [...prev, newTallaObj]);
        console.log("Talla nueva guardada:", newTallaObj);
      }
    }

    // limpiar estados y cerrar Drawer
    setDataChip(null);
    setChipscolor([]);
    setChips([]);
    setNewColor("");
    setNewPrice("");
    setOpen(false);

    setDrawerOpen(false);
  };

  console.log(codigo);
  const [number, setNumber] = useState(null);
  const handleOpenAlert = () => {
    setIsAlertOpen(true);
  };

  const handleCloseAlert = () => {
    setIsAlertOpen(false);
  };

  const handleConfirmAlert = (value) => {
    setNumber(value);
    ActualizarDescuento(value);
  };
  const handleOpen = () => {
    setOpen(true);
  };

  const handleCloses = () => {
    setOpen(false);
  };

  const handleConfirm = async () => {
    try {
      const isColor = drawerType === "color"; // 👈 Usa el mismo estado global
      const subcollection = isColor ? "colores" : "tallas";

      console.log(todelete, drawerType);

      if (isColor) {
        setChipscolor((prev) => prev.filter((chip) => chip.id !== todelete.id));
      } else {
        setChips((prev) => prev.filter((chip) => chip.id !== todelete.id));
      }

      console.log(todelete.id, "eliminar");
      if (!todelete.id) return;

      const productoRef = doc(db, "productos", codigo);
      const chipRef = doc(collection(productoRef, subcollection), todelete.id);
      await deleteDoc(chipRef);

      console.log(
        `✅ ${isColor ? "Color" : "Talla"} '${
          todelete.label
        }' eliminado de Firestore.`
      );
    } catch (error) {
      console.error("❌ Error eliminando chip:", error);
    }
    handleCloses();
  };

  const handleTitleChange = (e) => setTitle(e.target.value);
  const handlePriceChange = (e) => setPrice(e.target.value);
  const handleDimension = (e) => setDimension(e.target.value);
  const handleEspacio = (e) => setEspacio(e.target.value);

  const handleCantidad = (e) => setCantidad(e.target.value);

  const handleUbicacion = (e) => setUbicacion(e.target.value);

  const handleDetailsChange = (e) => setDetails(e.target.value);

  const getCurrentTimeInMilliseconds = () => {
    return Date.now();
  };
  //nuevo abajo

  const lugar = (pais) => {
    // Implement your `lugar` function logic here
    // Example:
    return pais === "Guinea Ecuatorial" ? "Nacional" : "Exterior";
  };
  const ActualizarDescuento = async (dato) => {
    let valor = parseInt(dato);
    let context = lugar(data.Pais);

    const dbRef = ref(database, `GE/${context}/Prod/${codigo}`);

    try {
      // Update the discount value
      console.log(dato, "existe");
      await update(dbRef, { Descuento: valor });

      if (valor > 0) {
        // If valor is not 0, update the Rebajas node
        const rebajasRef = ref(database, `GE/Rebajas/${codigo}`);
        const rebajasRef1 = ref(
          database,
          `GE/Filtros/${context}/${data.Categoria}/${codigo}`
        );
        const rebajasRef2 = ref(database, `GE/${context}/Prod/${codigo}`);

        // await update(rebajasRef, diccionario1);
        await update(rebajasRef1, { Descuento: valor });
      } else {
        // If valor is 0, remove the Rebajas node
        const rebajasRef = ref(database, `GE/Rebajas/${codigo}`);
        const rebajasRef1 = ref(
          database,
          `Filtros/${context}/${data.Categoria}/${codigo}`
        );
        await update(rebajasRef1, { Descuento: valor });

        await remove(rebajasRef);
      }

      console.log("Data updated successfully");

      // Simulate dismissing a loading indicator and enabling user interaction
      // Implement your actual UI update logic here
      // For example, using React state:
      // setLoading(false);
      // setUserInteractionEnabled(true);
    } catch (error) {
      console.error("Error updating data: ", error);
    }
  };

  const handleDeleteChip = async (chipToDelete, valor) => {
    setOpen(true);
    setToDelete(chipToDelete);
    console.log(chipToDelete, "a elimianr");
    setDrawerType(valor);
  };

  const handlePriceChanges = (e, chipName) => {
    setPrices({ ...prices, [chipName]: e.target.value });
  };
  const handleButtonClick = (view) => {
    setShowBox(false);
    setView(view);
    // Perform any additional actions based on the selected view
    console.log(`Selected view: ${view}`);
  };
  const chipOptions1 = [
    { label: "Aerea", value: "Aerea" },
    { label: "Maritima", value: "Maritima" },
  ];

  const confirmarEliminacion = (codigo) => {
    if (!codigo) {
      alert("Código del producto no válido.");
      return false;
    }
    console.log(codigo, "wettin");
    return window.confirm(
      "¿Seguro que quieres eliminar este producto y todas sus imágenes?"
    );
  };

  const eliminarDocumentoFirestore = async (codigo) => {
    const db = getFirestore(app);
    const ref = doc(db, "productos", codigo);
    await deleteDoc(ref);
    console.log("✅ Documento eliminado de Firestore");
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

  const obtenerProducto = async (codigo) => {
    const db = getFirestore(app);
    const productoRef = doc(db, "productos", codigo);
    const productoSnap = await getDoc(productoRef);

    if (!productoSnap.exists()) {
      throw new Error("El producto no existe en Firestore.");
    }

    return productoSnap.data();
  };

  const eliminarImagenes = async (imagenes = []) => {
    const storage = getStorage(app);

    for (const imgPath of imagenes) {
      try {
        const path = imgPath.startsWith("https")
          ? getPathFromUrl(imgPath)
          : imgPath;

        const imgRef = storageRef(storage, path);
        await deleteObject(imgRef);
        console.log(`🗑 Imagen eliminada: ${path}`);
      } catch (error) {
        console.warn(`No se pudo eliminar la imagen ${imgPath}:`, error);
      }
    }
  };

  // Helper para convertir URL → ruta interna del Storage
  const getPathFromUrl = (url) => {
    try {
      const parts = url.split("?")[0].split("/o/")[1];
      return decodeURIComponent(parts);
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const fetchData = async (codigo) => {
      try {
        // 1) Referencia al documento producto
        const productRef = doc(db, "productos", codigo);

        // 2) Leer el documento (getDoc)
        const docSnap = await getDoc(productRef);

        if (!docSnap.exists()) {
          console.log("❌ No existe el documento del producto:", codigo);
          // limpiar estados si hace falta
          setData(null);
          setChips([]);
          setChipscolor([]);
          return;
        }

        const productData = docSnap.data();
        setData(productData);

        // actualizar campos principales (comprueba nombres exactos en Firestore)
        setTitle(productData.Titulo ?? "");
        setUbicacion(productData.Ubicacion ?? "");
        setPrice(productData.Precio ?? "");
        setDetails(productData.Detalles ?? "");
        setStock(productData.Stock ?? "");

        console.log("Producto Data:", productData);

        // 3) Leer subcolecciones en paralelo (más rápido)
        const coloresRef = collection(db, "productos", codigo, "colores");
        const tallasRef = collection(db, "productos", codigo, "tallas");

        const [coloresSnap, tallasSnap] = await Promise.all([
          getDocs(coloresRef),
          getDocs(tallasRef),
        ]);

        // 4) Mapear colores (asegurarse de que label existe)
        const colores = coloresSnap.docs.map((doc) => doc.data());
        // 5) Mapear tallas
        const tallas = tallasSnap.docs.map((doc) => doc.data());

        console.log("Colores:", colores);

        setChipscolor(colores ? colores : []);
        setChips(tallas ? tallas : []);
      } catch (error) {
        console.error("❌ Error al obtener datos:", error);
      }
    };

    fetchData(codigo);

    // Cleanup function to unsubscribe when component unmounts
    return () => {
      // Unsubscribe from database
    };
  }, []);
  const handleToggleChange = (event) => {
    setStock(event.target.checked);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); // Start loading
    //CUando toca eliminar agregar se guardan los nombres y se hace un map iterando todo
    // para asi conseguir codigo
    //verificar el error en tallas

    const updatedObject = {
      Titulo: title,
      Precio: parseInt(MARGEN(price)),
      // Cantidad: parseInt(cantidad),
      Detalles: details,
      // Stock: stock,
      // Espacio: contexto === "Exterior" ? parseFloat(espacio) : 0,
      // Dimension: dimension !== undefined ? parseFloat(dimension) : 1.5,
      // Categoria: data.Categoria,
    };

    // Documento principal del producto
    const productoRef = doc(db, "productos", codigo);

    try {
      await updateDoc(productoRef, updatedObject);
      alert("Producto modificado correctamente!");
      setLoading(false);
      console.log("Producto actualizado correctamente.");
    } catch (error) {
      setLoading(false);
      alert("ERROR INESPERADO: " + error.message);
      console.error("Error al actualizar el producto:", error);
      // Aquí puedes mostrar un mensaje al usuario, por ejemplo con un toast
    }
  };

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

      <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2, padding: 2 }}>
        <Cabezal texto={"Editar"} />

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "flex-end",
            marginTop: isMobile ? 40 : 0,
          }}
        >
          <Button
            variant="contained"
            color="error"
            onClick={eliminarPostCompleto}
          >
            ELIMINAR PRODUCTO
          </Button>

          <Button variant="contained" color="info" onClick={handleOpenAlert}>
            APLICAR DESCUENTO
          </Button>
        </div>
        <div style={{ margin: 10 }}>
          <Typography variant="subtitle1" gutterBottom>
            Colores
          </Typography>
          {chipscolor.map((chip, index) => (
            <Chip
              key={index}
              label={chip.label}
              style={{ margin: 3 }}
              onClick={() => handleDrawerOpen("color", chip)}
              onDelete={() => handleDeleteChip(chip, "color")}
            />
          ))}
          <IconButton color="primary" onClick={() => handleDrawerOpen("color")}>
            <AddIcon />
          </IconButton>
        </div>
        <div style={{ margin: 10 }}>
          <Typography variant="subtitle1" gutterBottom>
            Tallas
          </Typography>
          {chips.map((chip, index) => (
            <Chip
              label={`${chip.label} : ${chip.precio}`}
              style={{ margin: 3 }}
              onClick={() => handleDrawerOpen("talla", chip)}
              onDelete={() => handleDeleteChip(chip, "talla")}
            />
          ))}
          <IconButton color="primary" onClick={() => handleDrawerOpen("talla")}>
            <AddIcon />
          </IconButton>
        </div>

        <Grid container spacing={2} marginTop={isMobile ? 5 : 0}>
          <Grid item xs={12}>
            <TextField
              label="Title"
              variant="outlined"
              value={title}
              onChange={handleTitleChange}
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
              onChange={handlePriceChange}
              required
              fullWidth
            />
          </Grid>
          {contexto === "Nacional" && (
            <Box display="flex" alignItems="flex-end" marginY={1} margin={1}>
              <TextField
                label="Cantidad"
                type="number"
                value={cantidad}
                onChange={handleCantidad}
                style={{ marginLeft: "8px" }}
              />
              <div style={{ margin: 10, marginLeft: 30 }}>
                <FormControlLabel
                  control={
                    <Switch checked={stock} onChange={handleToggleChange} />
                  }
                  label="Stock"
                />
              </div>
            </Box>
          )}

          <Grid item xs={12}>
            <TextField
              label="Details"
              variant="outlined"
              multiline
              rows={4}
              value={details}
              onChange={handleDetailsChange}
              required
              fullWidth
            />
          </Grid>

          <div
            style={{
              display: "flex",
              alignContent: "center",
              alignItems: "center",
            }}
          >
            <Button type="submit" variant="contained" color="primary">
              PUBLICAR
            </Button>
          </div>
        </Grid>
        {number && <p>Entered number: {number}</p>}
        <AlertComponent
          isOpen={isAlertOpen}
          onClose={handleCloseAlert}
          onConfirm={handleConfirmAlert}
        />
        <Alert
          open={open}
          message={"Seguro que desea borrar este valor?"}
          onClose={handleCloses}
          onConfirm={handleConfirm}
        />
        <Drawer anchor="right" open={drawerOpen} onClose={handleDrawerClose}>
          <Box sx={{ width: 300, padding: 2 }}>
            <Typography variant="h6" gutterBottom>
              {drawerType === "color" ? "Nuevo Color" : "Nueva Talla"}
            </Typography>

            {/* Siempre habilitado */}
            <TextField
              label={drawerType === "color" ? "Color" : "Talla"}
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              fullWidth
              margin="normal"
            />

            {/* Solo habilitado si es tipo con precio */}
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

            <Button
              variant="contained"
              color="primary"
              onClick={handleSaveNew}
              sx={{ mt: 2 }}
              fullWidth
            >
              Guardar
            </Button>
          </Box>
        </Drawer>
      </Box>
    </>
  );
};

export default EditarPost;
