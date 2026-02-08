import { useEffect } from "react";
import { ref, onValue, off, increment } from "firebase/database";
export const ColorMain = "";

export const extract = (string) => {
  const match = string.match(/\d{5}$/);
  return match ? match[0] : null;
};
// notificacion
export const lugar = (pais) =>
  pais === "Guinea Ecuatorial" ? "Nacional" : "Exterior";


// Function to send notification

export let analizar = (cod, valores) => {
  const checkmar = (obj) => obj.Codigo === cod;
  return valores.some(checkmar);
};
const useNotificationListener = (
  database,
  decrementValue,
  incrementValue,
  chekeaFecha
) => {
  useEffect(() => {
    const databaseReference = ref(database, "/GE/NotificacionReb");

    const handleData = (snapshot) => {
      snapshot.forEach((childSnapshot) => {
        const data = childSnapshot.val();
        const {
          contexto = "",
          Codigo = "",
          Vendedor = "",
          Comprador = "",
          Fecha = 0,
          isTrue = false,
          Id = "",
          Cantidad = 0,
        } = data;

        if (!isTrue) {
          if (contexto === "Nacional") {
            decrementValue(
              Cantidad,
              `GE/Nacional/Prod/${Codigo}/Cantidad`,
              Vendedor,
              Codigo,
              contexto
            );
            incrementValue(`GE/Nacional/Prod/${Codigo}/Compras`, Codigo);
          } else {
            incrementValue(`GE/Exterior/Prod/${Codigo}/Compras`, Codigo);
          }
        } else {
          chekeaFecha(Fecha, Id, Comprador);
        }
      });
    };

    const handleSnapshot = (snapshot) => {
      if (snapshot.exists()) {
        handleData(snapshot);
      } else {
        console.log("No data available");
      }
    };

    const unsubscribe = onValue(databaseReference, handleSnapshot, (error) => {
      console.error("Error fetching data:", error);
    });

    // Clean up listener on component unmount
    return () => {
      unsubscribe();
    };
  }, [database, decrementValue, incrementValue, chekeaFecha]);
};

export const capitalizeFirstLetter = (str) => {
  if (typeof str !== "string" || str.length === 0) {
    return str;
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export let puntodecimal = (n) => {
  if (n !== undefined) {
    var parts = n.toString().split(".");
    const numberPart = parts[0];
    const thousands = /\B(?=(\d{3})+(?!\d))/g;
    return numberPart.replace(thousands, ".");
  }
};
export default useNotificationListener;
export const compressImage = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const img = new Image();
      img.src = reader.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 900;

        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
          if (width > height && width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          } else if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => resolve(blob),
          "image/webp", // Use WebP for better compression
          1.0 // High quality
        );
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};


const dataURItoBlob = (dataURI) => {
  const byteString = atob(dataURI.split(",")[1]);
  const mimeString = dataURI.split(",")[0].split(":")[1].split(";")[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeString });
};

const dateFormatter = new Intl.DateTimeFormat('es-ES', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
});
export const fechas = timestamp => {
  if (!timestamp) return 'Sin fecha';

  // Si es un Timestamp de Firestore
  if (timestamp.toDate) {
    timestamp = timestamp.toDate();
  }

  const date = new Date(timestamp);
  if (isNaN(date)) return 'Fecha inválida';

  return dateFormatter.format(date);
};