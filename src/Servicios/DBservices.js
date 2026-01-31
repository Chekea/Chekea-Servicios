import { sendNotification } from "../ayuda";
import app from "./firebases";
import {
  getDatabase,
  push,
  ref,
  remove,
  set,
  update,
  runTransaction,
  get,
} from "firebase/database";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

const database = getDatabase(app);
const storage = getStorage(app);

export const getCurrentTimestamp = () => Date.now();

export const RemoveVaueDB = async (path) => {
  const nodeRef = ref(database, path);

  // Call the remove method to delete the node
  remove(nodeRef)
    .then(() => {
      console.log("Node deleted successfully");
    })
    .catch((error) => {
      console.error("Error deleting node:", error);
    });
};
export const WriteDb = async (objeto, reference) => {
  const databaseRef = ref(database, reference); // Replace '-Mabc123' with the actual key of the record you want to update

  // Update the field with the new value
  set(databaseRef, objeto)
    .then(() => {
      console.log("Data updated in Firebase Realtime Database successfully.");
    })
    .catch((error) => {
      console.error(
        "Error updating data in Firebase Realtime Database:",
        error
      );
    });
};
export const WriteDbPush = async (objeto, reference) => {
  try {
    // Get a reference to the desired location in the database
    const databaseRef = ref(database, reference);

    // Generate a new push key
    const newPushRef = push(databaseRef);
    const pushKey = newPushRef.key;
    console.log("Push key:", pushKey);

    // Store the push key inside the object
    objeto.Codigo = pushKey;

    // Create a reference to the new location with the push key
    const newLocationRef = ref(database, `${reference}/${pushKey}`);

    // Push the updated object to the new location
    await set(newLocationRef, objeto);

    console.log("Data updated in Firebase Realtime Database successfully.");
  } catch (error) {
    console.error(
      "Error updating data in Firebase Realtime Database:",
      error.message
    );
  }
};
export const UpdateDb = async (objeto, reference) => {
  const databaseRef = ref(database, reference); // Replace '-Mabc123' with the actual key of the record you want to update

  // Update the field with the new value
  update(databaseRef, objeto)
    .then(() => {
      console.log("Data updated in Firebase Realtime Database successfully.");
    })
    .catch((error) => {
      console.error(
        "Error updating data in Firebase Realtime Database:",
        error
      );
    });
};

export let PublicarComentario = async (codigo, id, contexto, obj) => {
  try {
    console.log(id, contexto, obj, "mani");

    // Reference for the comments section
    const databaseRef = ref(database, `GE/${contexto}/Prod/${id}/Comentarios`);

    // Create a new push reference for the comment
    const newPushRef = push(databaseRef);
    const pushKey = newPushRef.key;
    console.log("Push key:", pushKey);

    // Store the push key inside the object if needed
    obj.pushKey = pushKey;

    // Create a reference to the new location with the push key for the comment
    const newLocationRef = ref(
      database,
      `GE/${contexto}/Prod/${id}/Comentarios/${pushKey}`
    );

    // Push the updated object to the new location
    await set(newLocationRef, obj);

    // Reference to the product node to add a flag (e.g., a flag that a new comment exists)
    const productRef = ref(
      database,
      `GE/Comprador/${obj["id"]}/MisCompras/Retirado/${codigo}`
    );

    // Update the product node with a flag (for example, 'hasComments': true)
    await update(productRef, {
      Coment: true,
    });

    console.log("Comment published and product flagged successfully.");
  } catch (error) {
    alert("Error... Ha ocurrido un error inesperado");

    console.error("Error publishing comment:", error);
    // Handle the error as needed
  }
};

export const decrementValue = (amount, path, vendedor, codigo, contexto) => {
  const databaseRef = ref(database, path);

  runTransaction(databaseRef, (currentData) => {
    const value = currentData ? currentData : 0;
    const newValue = value - amount;

    return newValue;

    // Decrement the value

    // Update the value in the transaction
  })
    .then((result) => {
      const { committed, snapshot } = result;
      if (committed) {
        console.log("Transaction successful. New value:", snapshot.val());
        updatevalue(codigo);
      }
    })
    .catch((error) => {
      console.error("Transaction failed:", error.message);
    });
};

// Function to increment a value by 1
export const incrementValue = (database, path, codigo) => {
  const databaseRef = ref(database, path);

  return runTransaction(databaseRef, (currentData) => {
    const value = currentData ? currentData : 0;
    const newValue = value + 1;

    return newValue;
  })
    .then((result) => {
      const { committed, snapshot } = result;
      if (committed) {
        console.log("Transaction successful. New value:", snapshot.val());
        updatevalue(codigo);
      } else {
        console.log("Transaction aborted. No changes made.");
      }
    })
    .catch((error) => {
      console.error("Transaction failed:", error.message);
      throw error; // Re-throw the error for further handling
    });
};

// Function to update values
export const updatevalue = (codigo) => {
  const updatedValues = {
    isTrue: true,
    // Add other key-value pairs as needed
  };

  update(ref(database, `GE/NotificacionReb/${codigo}`), updatedValues)
    .then(() => {
      console.log("Values updated successfully!");
    })
    .catch((error) => {
      console.error("Error updating values:", error.message);
    });
};
// Function to update the stock value
export const updateStock = (codigo, contexto) => {
  const updatedValue = false; // Replace this with your new value
  const path = `GE/${contexto}/Prod/${codigo}/Stock`;

  const updateData = {
    [path]: updatedValue,
  };

  update(ref(database), updateData)
    .then(() => {
      console.log("Node updated successfully");
    })
    .catch((error) => {
      console.error("Error updating node:", error.message);
    });
};

export let subircompra = async (
  productos,
  valStatic,
  path,
  img,
  comisiones
) => {
  try {
    let comprasArray = [];

    await Promise.all(
      productos.map(async (item) => {
        // Reference for the comments section
        const databaseRef = ref(
          database,
          `GE/Comprador/${item["Comprador"]}/MisCompras/Verificando`
        );

        // Create a new push reference for the comment
        const newPushRef = push(databaseRef);
        const pushKey = newPushRef.key;

        let fecha = getCurrentTimestamp();

        item["Codigo"] = pushKey;
        item["Fecha"] = fecha;

        update(databaseRef, item)
          .then(() => {
            console.log(
              "Data updated in Firebase Realtime Database successfully."
            );
          })
          .catch((error) => {
            console.error(
              "Error updating data in Firebase Realtime Database:",
              error
            );
          });

        comprasArray.push({ id: pushKey, vendedor: item["Vendedor"] });
      })
    );

    await subirotro(comprasArray, valStatic, path, img);
  } catch (error) {
    console.error("Error updating MisCompras:", error);
    // Mostrardialogo("Error", "Ha ocurrido un error inesperado", () => {}, true);

    // Handle the error appropriately, e.g., show a message to the user
  }
};
export let subirotro = async (a, statico, path, img) => {
  try {
    // Reference for the comments section
    const databaseRef = ref(database, path);

    // Create a new push reference for the comment
    const newPushRef = push(databaseRef);

    const pushKey = newPushRef.key;

    const fech = getCurrentTimestamp();

    statico["Codigo"] = pushKey;
    statico["CompraId"] = fech;

    update(newPushRef, statico)
      .then(() => {
        console.log("Data updated in Firebase Realtime Database successfully.");
      })
      .catch((error) => {
        console.error(
          "Error updating data in Firebase Realtime Database:",
          error
        );
      });

    if (img !== "") {
      // await subirimagen(
      //   img,
      //   `${path}/${codio}`,
      //   `Recibos/Recibo Compra/${fech}.jpeg`
      // );
    }
    for (const item of a) {
      const itemReference = ref(
        database,
        `${path}/${pushKey}/Productos/${item.id}`
      );

      await update(itemReference, item);
    }
  } catch (error) {
    console.error("Error while uploading data:", error);
    // Handle the error appropriately, e.g., show a message to the user
  }
};
export const uploadImage = async (file, path) => {
  const imageRef = storageRef(storage, path);
  await uploadBytes(imageRef, file);
  console.log(getDownloadURL(imageRef));

  return await getDownloadURL(imageRef);
};

export const sendNotif = async (path) => {
  const databaseRef = ref(database, path);

  try {
    const snapshot = await get(databaseRef);
    if (snapshot.exists()) {
      const token = snapshot.val();
      console.log("Token obtenido:", token);

      // Llamar a la función de envío de notificación

      // Devolver el token
      return token;
    } else {
      console.log("Snapshot does not exist");
      return null;
    }
  } catch (error) {
    console.error("Error fetching data:", error);
    return null;
  }
};

