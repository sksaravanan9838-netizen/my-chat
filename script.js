import { initializeApp } from
  "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from
  "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp
} from
  "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";


// ===============================
// FIREBASE CONFIG
// ===============================

const firebaseConfig = {
  apiKey: "AIzaSyCZEtzAmFMHgS48_eOE-3OSeR_na_gTsoQ",
  authDomain: "mychatapp-a7825.firebaseapp.com",
  projectId: "mychatapp-a7825",
  storageBucket: "mychatapp-a7825.firebasestorage.app",
  messagingSenderId: "892094764997",
  appId: "1:892094764997:web:c7c5efc8eed248d5769dac",
  measurementId: "G-T8M0LBQ9J2"
};


// ===============================
// INITIALIZE FIREBASE
// ===============================

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);


// Current Firebase user
let currentUser = null;


// ===============================
// AUTH STATE
// ===============================

onAuthStateChanged(auth, (user) => {

  if (user) {

    currentUser = user;

    showChat();

    listenForMessages();

  } else {

    currentUser = null;

    showLogin();

  }

});


// ===============================
// SIGN UP
// ===============================

window.signup = async function () {

  const email =
    document.getElementById("emailInput").value.trim();

  const password =
    document.getElementById("passwordInput").value;

  const username =
    document.getElementById("usernameInput").value.trim();


  if (!email || !password || !username) {

    showAuthMessage(
      "Please enter username, email and password."
    );

    return;

  }


  if (password.length < 6) {

    showAuthMessage(
      "Password must be at least 6 characters."
    );

    return;

  }


  try {

    const result =
      await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );


    currentUser = result.user;


    localStorage.setItem(
      "myChatUsername",
      username
    );


    showChat();

    listenForMessages();


  } catch (error) {

    console.error(error);

    showAuthMessage(
      getFirebaseError(error.code)
    );

  }

};


// ===============================
// LOGIN
// ===============================

window.login = async function () {

  const email =
    document.getElementById("emailInput").value.trim();

  const password =
    document.getElementById("passwordInput").value;


  if (!email || !password) {

    showAuthMessage(
      "Please enter email and password."
    );

    return;

  }


  try {

    const result =
      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );


    currentUser = result.user;


    showChat();

    listenForMessages();


  } catch (error) {

    console.error(error);

    showAuthMessage(
      getFirebaseError(error.code)
    );

  }

};


// ===============================
// SHOW LOGIN
// ===============================

function showLogin() {

  document
    .getElementById("loginScreen")
    .classList.remove("hidden");


  document
    .getElementById("chatScreen")
    .classList.add("hidden");

}


// ===============================
// SHOW CHAT
// ===============================

function showChat() {

  document
    .getElementById("loginScreen")
    .classList.add("hidden");


  document
    .getElementById("chatScreen")
    .classList.remove("hidden");


  const username =
    localStorage.getItem("myChatUsername")
    || currentUser?.email
    || "User";


  document
    .getElementById("onlineUser")
    .innerText =
      username + " • Online";

}


// ===============================
// LOGOUT
// ===============================

window.logout = async function () {

  try {

    await signOut(auth);

    localStorage.removeItem("myChatUsername");

    currentUser = null;

    showLogin();

  } catch (error) {

    console.error(error);

  }

};


// ===============================
// SEND MESSAGE
// ===============================

window.sendMessage = async function () {

  if (!currentUser) {

    alert("Please login first.");

    return;

  }


  const input =
    document.getElementById("messageInput");

  const message =
    input.value.trim();


  if (!message) {

    return;

  }


  const username =
    localStorage.getItem("myChatUsername")
    || currentUser.email
    || "User";


  try {

    await addDoc(
      collection(db, "Messages"),
      {

        SenderId: currentUser.uid,

        Sendername: username,

        Text: message,

        Timestamp: serverTimestamp()

      }
    );


    input.value = "";


  } catch (error) {

    console.error(error);

    alert(
      "Message send failed. Check Firestore Rules."
    );

  }

};


// ===============================
// REAL-TIME MESSAGES
// ===============================

function listenForMessages() {

  const chatBox =
    document.getElementById("chatBox");


  const messagesQuery =
    query(
      collection(db, "Messages"),
      orderBy("Timestamp", "asc")
    );


  onSnapshot(
    messagesQuery,
    (snapshot) => {

      chatBox.innerHTML = "";


      snapshot.forEach((doc) => {

        const data = doc.data();


        const messageDiv =
          document.createElement("div");


        const isMine =
          currentUser &&
          data.SenderId === currentUser.uid;


        messageDiv.className =
          isMine
            ? "message sent"
            : "message received";


        const p =
          document.createElement("p");

        p.textContent =
          data.Text || "";


        const small =
          document.createElement("small");


        let time = "";


        if (data.Timestamp) {

          time =
            data.Timestamp
              .toDate()
              .toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit"
              });

        }


        small.textContent =
          `${data.Sendername || "User"} • ${time}`;


        messageDiv.appendChild(p);

        messageDiv.appendChild(small);

        chatBox.appendChild(messageDiv);

      });


      chatBox.scrollTop =
        chatBox.scrollHeight;

    },

    (error) => {

      console.error(
        "Firestore listener error:",
        error
      );

    }

  );

}


// ===============================
// AUTH ERROR MESSAGES
// ===============================

function getFirebaseError(code) {

  switch (code) {

    case "auth/email-already-in-use":
      return "This email is already registered.";

    case "auth/invalid-email":
      return "Invalid email address.";

    case "auth/invalid-credential":
      return "Wrong email or password.";

    case "auth/weak-password":
      return "Password is too weak.";

    default:
      return "Authentication failed. Please try again.";

  }

}


// ===============================
// AUTH MESSAGE
// ===============================

function showAuthMessage(message) {

  document
    .getElementById("authMessage")
    .innerText = message;

}


// ===============================
// ENTER KEY
// ===============================

document
  .getElementById("messageInput")
  .addEventListener(
    "keydown",
    function (event) {

      if (event.key === "Enter") {

        sendMessage();

      }

    }
  );
