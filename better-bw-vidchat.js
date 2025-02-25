// Just some constants
const LS_PREFIX = "BW-EXT:";
const CTRL_CLASS = 'bw-ext-controls';
const USER_LIST_ID = 'userList';
const USER_ITEM_CLASS = 'online-user-item';
const CHAT_WINDOW_CLASS = 'jsPanel';
const CHAT_HEADER_CLASS = 'jsPanel-title';
const IFRAME_ID = 'iframeChat';
const VAL_POS = 'Y';
const VAL_NEG = 'N';
// Toggle
const DEBUGGING_ON = false;

// Global variable because lazy
let iFrameGlobal;

// Function to handle mutations
function handleUserListMutations(mutations) {
  mutations.forEach((mutation) => {
    // Check if the mutation involves changes to the child nodes
    if (mutation.type === 'childList') {
      // Iterate through added nodes
      mutation.addedNodes.forEach((addedNode) => {
        // Check if the added node has the class "online-user-item"
        if (addedNode.classList && addedNode.classList.contains(USER_ITEM_CLASS)) {
          const username = usernameFromListItem(addedNode);
          if (username) {
            // Normalize and remove the unique key part
            const userVal = getUserVal(username);
            updateRow(addedNode, userVal);
          }
          maybeAddNewButton(addedNode);
        }
      });
    }
  });
};

function handleChatboxMutations(mutations) {
  mutations.forEach((mutation) => {
    if (mutation.type === 'childList') {
      mutation.addedNodes.forEach((addedNode) => {
        if (addedNode.classList && addedNode.classList.contains(CHAT_WINDOW_CLASS)) {
          maybeAddRotateButton(addedNode);
        }
      });
    }
  });
}

function getMainChatElementId(topLevelElement) {
  const el = topLevelElement.querySelectorAll('.tab-content');
  if (!el || el.length === 0 || el[0].childNodes.length === 0) {
    return null;
  }
  return el[0].childNodes[0].id;
}

function findHasCam(username) {
  const users = iFrameGlobal.querySelectorAll('.online-user-item[data-username="' + username + '"]');
  if (users) {
    // Convert because NodeList is not Array
    const userArray = Array.from(users);
    return userArray.some((el) => {
      return el.getAttribute('data-webcam') === "true";
    });
  }
  return false;
}

// For the actual text chat main tab
function handleChatMutations(mutations) {
  mutations.forEach((mutation) => {
    if (mutation.type === 'childList') {
      mutation.addedNodes.forEach((addedNode) => {
        if (!addedNode.classList) {
          return;
        }
        if (addedNode.classList.contains('webcamRequested')) {
          // Highlight webcam requests
          try {
            // TODO: Figure out why this is tweaking out the chat scroll?
            const button = addedNode.querySelector('button.acceptBtn');
            if (button) {
              const username = button.getAttribute('data-username');
              console.log("Request from " + username);
              const hasCam = findHasCam(username);
              if (hasCam) {
                console.log("User " + username + " has cam on");
                addedNode.style.borderLeft = "5px solid green";
              } else {
                console.log("User " + username + " does not have cam on");
                addedNode.style.borderLeft = "5px solid red";
              }
              const val = getUserVal(username);
              if (val) {
                // Highlight row for like/dislike
                updateRow(addedNode, val);
              }
              // Linkify asks for vid chat thing so I can see their profiles before accepting if I want
              // TODO: TEST ME!
              for (const childNode of addedNode.childNodes) {
                if (childNode.nodeType === Node.TEXT_NODE && childNode.textContent.indexOf(username) > -1) {
                  const newSpan = document.createElement('span');
                  newSpan.innerHTML = linkifyChatUserRequest(username, childNode.textContent)
                  childNode.replaceWith(newSpan);
                  break;
                }
              }
            }
          } catch (err) {
            console.warn("Failed to mutate text chat DOM", err.message);
          }
        }
        // Updates row color for `<name> has opened his webcam` notifications
        if (addedNode.classList.contains("webcamOpened")) {
          try {
            const content = addedNode.querySelector('.watchCam').textContent;
            const matches = new RegExp(/User (\w+)/gi).exec(content);
            const username = matches[1];
            const val = getUserVal(username);
            if (val) {
              updateRow(addedNode, val);
            }
          } catch (err) {
            console.warn("failed to get username from webcam opened message: " + content);
          }

        } else if (addedNode.classList.contains("message")) {
          console.log('AddedNode message',  addedNode);
        }
      })
    }
  });
}

let globalChatTabInitiationObserver;

function initTextChatMutationObserver() {
  const chatMutationObserver = new MutationObserver(handleChatMutations);
  const chatElementId = getMainChatElementId(iFrameGlobal);
  if (chatElementId) {
    if (globalChatTabInitiationObserver) {
      // Kill observer if it exists
      console.log("disconnecting the listener for text chat");
      globalChatTabInitiationObserver.disconnect();
    }
    const chatElement = iFrameGlobal.getElementById(chatElementId);
    chatMutationObserver.observe(
      chatElement,
      {
        childList: true,
        subtree: false,
      }
    );
  } else {
    console.log("no chat yet? try reloading.");
  }
}
function handleChatInitializeMutation(mutations) {
  mutations.forEach((mutation) => {
    // Check if the mutation involves changes to the child nodes
    if (mutation.type === 'childList') {
      // Iterate through added nodes
      mutation.addedNodes.forEach((addedNode) => {
        if (addedNode.nodeType !== Node.ELEMENT_NODE) {
          console.log("Mutation detected that was not a node element delta");
          return;
        }
        if (addedNode.querySelector('.tab-pane') || addedNode.id.startsWith("room_")) {
          console.log("Oh is that chat?");
          initTextChatMutationObserver();
        } else {
          console.log("Still no text chat...");
        }
      });
    }
  });
}

/** Because they don't appear right away */
function setupChatWindowHandlers(iframeDocument) {
  globalChatTabInitiationObserver = new MutationObserver(handleChatInitializeMutation);
  const textChatContainerElement = iframeDocument.querySelector('#chatContainer #tabs .tab-content');
  globalChatTabInitiationObserver.observe(
    textChatContainerElement,
    {
      childList: true,
      subtree: false,
    }
  );
}

// Function to set up MutationObserver for the iframe
function setupMutationObservers(iframeChat) {
  Logger("Setting up observer...");
  // Access the contentDocument of the iframe
  const iframeDocument = iframeChat.contentDocument;

  if (iframeDocument) {
    iFrameGlobal = iframeDocument;
    // Target element to observe inside the iframe
    const userListElement = iframeDocument.getElementById(USER_LIST_ID);
    const chatContainerElement = iframeDocument.querySelector('body'); // Yeah, it's that high up.
    // Options for the observer

    const userListMutationObserver = new MutationObserver(handleUserListMutations);
    const chatContainerMutationObserver = new MutationObserver(handleChatboxMutations);

    const chatElementId = getMainChatElementId(iframeDocument);
    if (chatElementId) {
      console.log("chat is already loaded");
      initTextChatMutationObserver();
    } else {
      console.log("Chat hasn't loaded yet- setting up the waiter.");
      setupChatWindowHandlers(iframeDocument);
    }

    // Set up initial state
    const existingOnlines = userListElement.querySelectorAll('.' + USER_ITEM_CLASS)
    Logger("Checking for initial update if iFrame DOM is somehow done rendering.");
    if (existingOnlines) {
      existingOnlines.forEach((listItem) => {
        const user = usernameFromListItem(listItem);
        if (user) {
          maybeAddNewButton(listItem);
          const val = getUserVal(user);
          if (val) {
            updateRow(listItem, val);
          }
        }
      });
    }
    // Start observing.
    userListMutationObserver.observe(
      userListElement,
      {
        childList: true, // Just 1 level descendent nodes
        subtree: false, // We don't want updates on time changes or button updates
      }
    );
    // For the video windows
    chatContainerMutationObserver.observe(
      chatContainerElement,
      {
        childList: true,
        subtree: false,
      }
    );
  } else {
    console.error('Unable to access iframe contentDocument.');
  }
};

function isIframeReady(iframe) {
  return iframe.contentDocument && iframe.contentDocument.readyState === 'complete';
};

function awaitIframeReadyInit() {
  const iframeChat = document.getElementById(IFRAME_ID);
  if (isIframeReady(iframeChat)) {
    Logger('iFrame is ready, initializing.');
    initExtension();
  } else {
    // If the iframe is not ready, check again after a short delay
    Logger('iFrame is not yet ready, waiting to try again.');
    setTimeout(awaitIframeReadyInit, 200);
  }
};

// Initialize: operate on the iFrame DOM
function initExtension() {
  const chatIframe = document.getElementById(IFRAME_ID);
  if (chatIframe) {
    // Set up the MutationObserver for the iframe
    setupMutationObservers(chatIframe);
    addResetButton(chatIframe);
  } else {
    console.error('Chat iframe element not found.');
  }
}

function addResetButton(iframe) {
  if (iframe.contentDocument) {
    const newBtn = document.createElement('button');
    newBtn.classList.add('btn', 'btn-danger');
    newBtn.textContent = 'Reset Likes/Dislikes';
    newBtn.onclick = clearAll;
    Logger("Adding reset button to params modal.");
    iframe.contentDocument.querySelector('#configModal .modal-content .modal-body').appendChild(newBtn);
  }
}

function maybeAddNewButton(parentElement) {
  if (parentElement.querySelector('.' + CTRL_CLASS)) {
    return; // Don't add again
  }
  const username = usernameFromListItem(parentElement);
  const btnCont = document.createElement('div');
  const btnY = document.createElement('button');
  const btnN = document.createElement('button');
  btnY.textContent = '+';
  btnN.textContent = '-';
  // Assumption: bootstrap css is always there
  btnY.classList.add('btn', 'btn-xs');
  btnN.classList.add('btn', 'btn-xs');
  btnY.onclick = function(e) {
    e.stopPropagation();
    const uv = getUserVal(username);
    const shouldResetVal = uv === VAL_POS;
    if (shouldResetVal) {
      clearUserVal(username);
      updateRow(parentElement, 'reset');
    } else {
      updateUserVal(username, VAL_POS);
      updateRow(parentElement, VAL_POS);
    }
    return false;
  }
  btnN.onclick = function(e) {
    e.stopPropagation();
    const uv = getUserVal(username);
    const shouldResetVal = uv === VAL_NEG;
    if (shouldResetVal) {
      clearUserVal(username);
      updateRow(parentElement, 'reset');
    } else {
      updateUserVal(username, VAL_NEG);
      updateRow(parentElement, VAL_NEG);
    }
    return false;
  }
  btnCont.appendChild(btnY);
  btnCont.appendChild(btnN);
  btnCont.classList.add(CTRL_CLASS);
  parentElement.appendChild(btnCont);
}

function maybeAddRotateButton(chatWindow) {
  if (chatWindow.querySelector('.' + CTRL_CLASS)) {
    return; // Don't add again
  }
  const btnRotate = document.createElement('button');
  btnRotate.style.float = 'right';
  btnRotate.style.fontSize = '0.7em';
  btnRotate.style.margin = '0 2px';
  btnRotate.style.padding = '0 2px';
  btnRotate.style.position = 'relative';
  btnRotate.style.border = '1px solid #DDD';
  btnRotate.style.top = '2px';
  btnRotate.style.height = '15px';
  btnRotate.onclick = function(e) {
    e.stopPropagation();
    const vid = chatWindow.querySelector('video');
    if (vid) {
      if (vid.style.transform) {
        vid.style.transform = null;
      } else {
        vid.style.transform = 'rotate(180deg)';
      }
    }
    return false;
  }
  btnRotate.textContent = 'Rotate';
  btnRotate.classList.add(CTRL_CLASS);
  chatWindow.querySelector('.' + CHAT_HEADER_CLASS).appendChild(btnRotate);
}

function usernameToDataKey(username) {
  return LS_PREFIX + username.toLowerCase().replace(/_.+/, '');
}
function usernameFromListItem(listItem) {
  return listItem.getAttribute('data-username');
}

function updateUserVal(username, val) {
  window.localStorage.setItem(usernameToDataKey(username), val);
}
function getUserVal(username) {
  return window.localStorage.getItem(usernameToDataKey(username));
}
function clearUserVal(username) {
  window.localStorage.removeItem(usernameToDataKey(username));
}
function updateRow(addedNode, value) {
  if (value) {
    if (value == VAL_POS) {
      addedNode.style.backgroundColor = '#b2ffb2';
    } else if (value == VAL_NEG) {
      addedNode.style.backgroundColor = '#ffc4c4';
    } else {
      addedNode.style.backgroundColor = null;
    }
  }
}
function Logger(log) {
  if (DEBUGGING_ON) {
    console.log(log);
  }
}

function linkifyChatUserRequest(username, innerHTML) {
  const unCleansed = username.replace(/[^\w\-]/i, ''); // for HTML inject safety
  const unUrl = encodeURIComponent(username);
  const linkHTML = `<a href="https://bateworld.com/profile.php?user=${unUrl}" target="_blank">${ununCleansedClean}</a>`
  return innerHTML.replace(username, linkHTML);
}

function clearAll() {
  if (confirm("This will reset all of your likes and dislikes. Are you sure?")) {
    let count = 0;
    for (const i in window.localStorage) {
      if (i.match((new RegExp('^'+LS_PREFIX)))) {
        window.localStorage.removeItem(i);
        count++;
      }
    }
    updateAllRows();
    Logger("Deleted " + count + " entries.");
    alert("Data reset.");
  }
}

function updateAllRows() {
  // Only works once the stuff is all set up.
  if (iFrameGlobal) {
    const userList = iFrameGlobal.querySelectorAll('.' + USER_ITEM_CLASS);
    Logger("Updating " + userList.length + " rows.");
    userList.forEach((listItem) => {
      const username = usernameFromListItem(listItem);
      if (username) {
        // Normalize and remove the unique key part
        const userVal = getUserVal(username);
        if (!userVal) {
          updateRow(listItem, 'reset');
        } else {
          updateRow(listItem, userVal);
        }
      }
    })
  }
}

// Main:
Logger("Plugin loaded");
if (document.readyState !== 'loading') {
  Logger('document is already ready, just execute code here');
  awaitIframeReadyInit();
} else {
  Logger('initializing ready state listener');
  document.addEventListener('DOMContentLoaded', function () {
    awaitIframeReadyInit();
  });
}
