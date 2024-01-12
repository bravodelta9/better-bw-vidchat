// Just some constants
const LS_PREFIX = "BW-EXT:";
const CTRL_CLASS = 'bw-ext-controls';
const USER_LIST_ID = 'userListMain';
const USER_ITEM_CLASS = 'online-user-item';
const IFRAME_ID = 'iframeChat';
const VAL_POS = 'Y';
const VAL_NEG = 'N';
// Toggle
const DEBUGGING_ON = false;

// Global variable because lazy
let iFrameGlobal;

// Function to handle mutations
function handleMutations(mutations) {
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

// Function to set up MutationObserver for the iframe
function setupMutationObserver(iframeChat) {
  Logger("Setting up observer...");
  // Access the contentDocument of the iframe
  const iframeDocument = iframeChat.contentDocument;

  if (iframeDocument) {
    iFrameGlobal = iframeDocument;
    // Target element to observe inside the iframe
    const targetElementInsideIframe = iframeDocument.getElementById(USER_LIST_ID);

    // Options for the observer
    const observerOptions = {
      childList: true,
      subtree: true,
      // Add other options as needed
    };

    // Create a new MutationObserver with the callback function
    const mutationObserver = new MutationObserver(handleMutations);

    // Set up initial state
    const existingOnlines = targetElementInsideIframe.querySelectorAll('.' + USER_ITEM_CLASS)
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
    // Start observing the target element inside the iframe with the specified options
    mutationObserver.observe(targetElementInsideIframe, observerOptions);
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
    setupMutationObserver(chatIframe);
    addClearButton(chatIframe);
    addChatObjectShims();
  } else {
    console.error('Chat iframe element not found.');
  }
}

// This is where stuff is most likely to break
function addChatObjectShims() {
  Logger("Registering Chat Shims");
  // Nothing ATM
}

function addClearButton(iframe) {
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
  const userVal = getUserVal(username);
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