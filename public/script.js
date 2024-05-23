const socket = io();
const img = document.getElementById('screen');
const startButton = document.getElementById('start');
const stopButton = document.getElementById('stop');
const joinButton = document.getElementById('join');
const roomInput = document.getElementById('room');
const roomNameDisplay = document.getElementById('room-name');

let mediaRecorder;
let room = '';

function sendControlEvent(eventType, eventData) {
  socket.emit('control-event', { type: eventType, data: eventData }, room);
}

function simulateMouseEvent(type, x, y, button = 0) {
  const event = new MouseEvent(type, {
    view: window,
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
    button: button
  });
  document.elementFromPoint(x, y).dispatchEvent(event);
}

function simulateKeyboardEvent(type, key) {
  const event = new KeyboardEvent(type, { key });
  document.dispatchEvent(event);
}

function simulateScrollEvent(deltaX, deltaY) {
  window.scrollBy(deltaX, deltaY);
}

function transformCoordinates(x, y, imgWidth, imgHeight, clientWidth, clientHeight) {
  const transformedX = (x / imgWidth) * clientWidth;
  const transformedY = (y / imgHeight) * clientHeight;
  return { x: transformedX, y: transformedY };
}

document.addEventListener('keydown', (event) => {
  sendControlEvent('keydown', event.key);
});

document.addEventListener('keyup', (event) => {
  sendControlEvent('keyup', event.key);
});

document.addEventListener('mousedown', (event) => {
  sendControlEvent('mousedown', { button: event.button, x: event.clientX, y: event.clientY });
});

document.addEventListener('mouseup', (event) => {
  sendControlEvent('mouseup', { button: event.button, x: event.clientX, y: event.clientY });
});

document.addEventListener('mousemove', (event) => {
  sendControlEvent('mousemove', { x: event.clientX, y: event.clientY });
});

document.addEventListener('wheel', (event) => {
  sendControlEvent('wheel', { deltaX: event.deltaX, deltaY: event.deltaY });
});

joinButton.addEventListener('click', () => {
  room = roomInput.value.trim();
  if (room) {
    socket.emit('join-room', room);
    roomNameDisplay.textContent = `Room: ${room}`;
    console.log(`Joined room: ${room}`);
  }
});

startButton.addEventListener('click', startCapture);
stopButton.addEventListener('click', stopCapture);

async function startCapture() {
  try {
    const displayMediaOptions = {
      video: {
        cursor: "always"
      },
      audio: false
    };

    const stream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
    const videoTrack = stream.getVideoTracks()[0];
    const imageCapture = new ImageCapture(videoTrack);

    mediaRecorder = setInterval(async () => {
      try {
        const bitmap = await imageCapture.grabFrame();
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const context = canvas.getContext('2d');
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        socket.emit('screen-data', { dataUrl, imgWidth, imgHeight }, room);
      } catch (error) {
        console.error('Error capturing screen:', error);
      }
    }, 100); 

  } catch (err) {
    console.error("Error: " + err);
  }
}

function stopCapture() {
  clearInterval(mediaRecorder);
  console.log("Screen capture stopped.");
}

socket.on('screen-data', ({ dataUrl, imgWidth, imgHeight }) => {
  img.src = dataUrl;
  img.dataset.width = imgWidth;
  img.dataset.height = imgHeight;
});

socket.on('control-event', (event) => {
  const imgRect = img.getBoundingClientRect();
  const clientWidth = imgRect.width;
  const clientHeight = imgRect.height;
  const imgWidth = img.dataset.width;
  const imgHeight = img.dataset.height;

  if (!imgWidth || !imgHeight) {
    console.error('Image dimensions not set');
    return;
  }

  const { x, y } = transformCoordinates(event.data.x, event.data.y, imgWidth, imgHeight, clientWidth, clientHeight);

  switch (event.type) {
    case 'mousemove':
      simulateMouseEvent('mousemove', x, y);
      break;
    case 'mousedown':
      simulateMouseEvent('mousedown', x, y, event.data.button);
      break;
    case 'mouseup':
      simulateMouseEvent('mouseup', x, y, event.data.button);
      break;
    case 'keydown':
      simulateKeyboardEvent('keydown', event.data);
      break;
    case 'keyup':
      simulateKeyboardEvent('keyup', event.data);
      break;
    case 'wheel':
      simulateScrollEvent(event.data.deltaX, event.data.deltaY);
      break;
    default:
      console.error(`Unknown event type: ${event.type}`);
  }
});
