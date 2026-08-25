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
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp
} from
  "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";


const firebaseConfig = {
  apiKey: "AIzaSyCZEtzAmFMHgS48_eOE-3OSeR_na_gTsoQ",
  authDomain: "mychatapp-a7825.firebaseapp.com",
  projectId: "mychatapp-a7825",
  storageBucket: "mychatapp-a7825.firebasestorage.app",
  messagingSenderId: "892094764997",
  appId: "1:892094764997:web:c7c5efc8eed248d5769dac",
  measurementId: "G-T8M0LBQ9J2"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let currentUsername = "";
let selectedUser = null;
let stopMessagesListener = null;


// ===============================
// AUTH STATE
// ===============================

onAuthStateChanged(auth, async (user) => {

  if (user) {

    currentUser = user;

    await loadCurrentUser();

    showChat();

    loadUsers();

  } else {

    currentUser = null;
    selectedUser = null;

    if (stopMessagesListener) {
      stopMessagesListener();
      stopMessagesListener = null;
    }

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


  if (username.length < 3) {

    showAuthMessage(
      "Username must be at least 3 characters."
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
    currentUsername = username;


    await setDoc(
      doc(db, "Users", currentUser.uid),
      {
        uid: currentUser.uid,
        username: username,
        email: email
      }
    );


    localStorage.setItem(
      "myChatUsername",
      username
    );


    showAuthMessage("");

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

    await loadCurrentUser();

    showAuthMessage("");

  } catch (error) {

    console.error(error);

    showAuthMessage(
      getFirebaseError(error.code)
    );

  }

};


// ===============================
// LOAD CURRENT USER
// ===============================

async function loadCurrentUser() {

  if (!currentUser) return;


  const userRef =
    doc(db, "Users", currentUser.uid);

  const userSnap =
    await getDoc(userRef);


  if (userSnap.exists()) {

    const data = userSnap.data();

    currentUsername =
      data.username ||
      currentUser.email ||
      "User";

  } else {

    currentUsername =
      localStorage.getItem("myChatUsername") ||
      currentUser.email ||
      "User";


    await setDoc(
      userRef,
      {
        uid: currentUser.uid,
        username: currentUsername,
        email: currentUser.email
      }
    );

  }


  localStorage.setItem(
    "myChatUsername",
    currentUsername
  );

}


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


  document
    .getElementById("onlineUser")
    .innerText =
      currentUsername + " • Online";

}


// ===============================
// LOGOUT
// ===============================

window.logout = async function () {

  try {

    await signOut(auth);

  } catch (error) {

    console.error(error);

  }

};


// ===============================
// LOAD USERS
// ===============================

async function loadUsers() {

  const usersList =
    document.getElementById("usersList");

  if (!usersList || !currentUser) return;


  usersList.innerHTML =
    "<div class='user-item'>Loading users...</div>";


  const usersQuery =
    query(
      collection(db, "Users"),
      orderBy("username")
    );


  onSnapshot(
    usersQuery,
    (snapshot) => {

      usersList.innerHTML = "";

      let found = false;


      snapshot.forEach((userDoc) => {

        const data = userDoc.data();


        if (data.uid === currentUser.uid) {
          return;
        }


        found = true;


        const userDiv =
          document.createElement("div");

        userDiv.className =
          "user-item";


        userDiv.innerHTML = `
          <div class="user-avatar">👤</div>
          <div class="user-name">
            ${escapeHtml(data.username || "User")}
          </div>
        `;


        userDiv.onclick = function () {

          selectUser({
            uid: data.uid,
            username: data.username || "User"
          });

        };


        usersList.appendChild(userDiv);

      });


      if (!found) {

        usersList.innerHTML =
          "<div class='user-item'>No other users yet.</div>";

      }

    },

    (error) => {

      console.error("Users error:", error);

      usersList.innerHTML =
        "<div class='user-item'>Unable to load users.</div>";

    }
  );

}


// ===============================
// SEARCH USERS
// ===============================

window.searchUsers = function () {

  const input =
    document
      .getElementById("userSearchInput")
      .value
      .trim()
      .toLowerCase();


  const items =
    document.querySelectorAll(".user-item");


  items.forEach((item) => {

    const name =
      item
        .querySelector(".user-name")
        ?.innerText
        .toLowerCase() || "";


    if (!input || name.includes(input)) {

      item.style.display = "flex";

    } else {

      item.style.display = "none";

    }

  });

};


// ===============================
// SELECT USER
// ===============================

function selectUser(user) {

  selectedUser = user;


  document
    .getElementById("chatTitle")
    .innerText =
      user.username;


  document
    .getElementById("onlineUser")
    .innerText =
      "Private chat 🔐";


  document
    .getElementById("messageInput")
    .placeholder =
      "Message " + user.username + "...";


  listenForPrivateMessages();

}


// ===============================
// CREATE CHAT ID
// ===============================

function getChatId(uid1, uid2) {

  return [uid1, uid2]
    .sort()
    .join("_");

}


// ===============================
// SEND PRIVATE MESSAGE
// ===============================

window.sendMessage = async function () {

  if (!currentUser) {

    alert("Please login first.");

    return;
  }


  if (!selectedUser) {

    alert("Please select a user first.");

    return;
  }


  const input =
    document.getElementById("messageInput");

  const message =
    input.value.trim();


  if (!message) return;


  const chatId =
    getChatId(
      currentUser.uid,
      selectedUser.uid
    );


  try {

    await addDoc(
      collection(
        db,
        "Chats",
        chatId,
        "Messages"
      ),
      {
        SenderId: currentUser.uid,
        Sendername: currentUsername,
        ReceiverId: selectedUser.uid,
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
// PRIVATE MESSAGES
// ===============================

function listenForPrivateMessages() {

  if (!currentUser || !selectedUser) return;


  if (stopMessagesListener) {

    stopMessagesListener();
    stopMessagesListener = null;

  }


  const chatBox =
    document.getElementById("chatBox");


  chatBox.innerHTML =
    `<div class="message received">
       <p>Private chat with ${escapeHtml(selectedUser.username)} 🔐</p>
       <small>My Chat</small>
     </div>`;


  const chatId =
    getChatId(
      currentUser.uid,
      selectedUser.uid
    );


  const messagesQuery =
    query(
      collection(
        db,
        "Chats",
        chatId,
        "Messages"
      ),
      orderBy("Timestamp", "asc")
    );


  stopMessagesListener =
    onSnapshot(
      messagesQuery,
      (snapshot) => {

        chatBox.innerHTML = "";


        snapshot.forEach((messageDoc) => {

          const data =
            messageDoc.data();


          const messageDiv =
            document.createElement("div");


          const isMine =
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
          "Private chat listener error:",
          error
        );

      }
    );

}


// ===============================
// ESCAPE HTML
// ===============================

function escapeHtml(text) {

  const div =
    document.createElement("div");

  div.textContent = text;

  return div.innerHTML;

}


// ===============================
// AUTH ERROR
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
