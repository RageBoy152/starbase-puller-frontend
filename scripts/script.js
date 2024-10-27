const backendURL = 'http://localhost:3001/';
let loadedVideoId = 'OLrmlRbwTik';
let watermark = 'LabPadreV2';
const screenshotTime = '0';
let player;
let durationTimeUnixS;
durationOffset = false;
let savedBounds;



let streams = [];
let brands = [];

async function getStreams() {
  let data = await fetch('scripts/streams.json');
  let jsonData = await data.json();

  streams = jsonData.streams;
  brands = jsonData.brands;

  for (let i=0; i<streams.length; i++) {
    $('#load-stream-dropdown')[0].innerHTML += `<option value=${streams[i].videoId}>${streams[i].videoName}</option>`
  }
  for (let i=0; i<brands.length; i++) {
    $('.branding-select')[0].innerHTML += `<option value=${brands[i].fileName}>${brands[i].displayName}</option>`
    $('.branding-select')[1].innerHTML += `<option value=${brands[i].fileName}>${brands[i].displayName}</option>`
  }
  $('.branding-select')[0].value = watermark;
  $('.branding-select')[1].value = watermark;
  $('#load-stream-dropdown').val(loadedVideoId);
}
getStreams();



let startX;
let startY;
let pullerBusy = false;



function toggleCrop(cropMode) {
  if (pullerBusy) { return; }

  $(`.${cropMode}-btn`).toggleClass('bg-secondary-hover, bg-secondary');
  $('.crop-overlay').toggleClass('invisible');
  $('.crop-square').attr('data-cropmode', cropMode);
}



$(document).keydown((e) => {
  if (!$('.crop-overlay')[0].classList.contains('invisible') && e.key == 'Escape') {
    $(`.video-btn, .photo-btn`).removeClass('bg-secondary');
    $(`.video-btn, .photo-btn`).addClass('bg-secondary-hover');
    toggleCrop();
  }
});


$('.crop-overlay').mousemove((e) => {
  $('.crop-line.vert').css({ 'left': `${e.clientX}px` });
  $('.crop-line.horiz').css({ 'top': `${e.clientY - $('.crop-overlay')[0].getBoundingClientRect().top}px` });

  if (e.buttons) {
    let currentX = e.clientX;
    let currentY = e.clientY - $('.crop-overlay')[0].getBoundingClientRect().top;

    // dragging

    $('.crop-square').css({
      'left': `${Math.min(startX, currentX)}px`,
      'top': `${Math.min((startY - $('.crop-overlay')[0].getBoundingClientRect().top), currentY)}px`,
      'width': `${Math.abs(currentX - startX)}px`,
      'height': `${Math.abs(currentY - (startY - $('.crop-overlay')[0].getBoundingClientRect().top))}px`
    });
  }
});


$('.crop-overlay').mousedown((e) => {
  // drag start

  $('.crop-line').addClass('invisible');

  // init starting drag pos
  startX = e.clientX;
  startY = e.clientY;
});


$('.crop-overlay').mouseup((e) => {
  // drag end

  // unhide crop lines
  $('.crop-line').removeClass('invisible');

  savedBounds = $('.crop-square')[0].getBoundingClientRect();

  // reset crop-square
  toggleCrop();
  $('.crop-square').css({
    'width': '0',
    'height': '0'
  });


  // log crop data
  console.log(savedBounds);

  $('.crop-square').attr('data-cropmode') == 'photo' ? openDropup('photo') : openDropup('video');
});




function offsetHour(utcHour, zOffset) {
  //  perform raw offset
  offset = utcHour + zOffset


  //  correct for day crossing
  if (offset >= 24) { offset = offset - 24; }
  else if (offset < 0) { offset = 24 + offset; }
  

  //  return offset hour formatted
  return offset
}




async function screenShot() {
  console.log("Screenshotting");
  pullerBusy = true;

  const rawData = await fetch(`${backendURL}screenshot?cropBounds=${JSON.stringify(savedBounds)}&videoId=${loadedVideoId}&endTime=${screenshotTime}&length=0&watermark=${watermark}&watermarkPos=1`);
  const data = await rawData.json();

  console.log(data);
  $(`.photo-btn`).toggleClass('bg-secondary-hover, bg-secondary');
  pullerBusy = false;
}


async function pullGIF() {
  let startTime = $('#start-time-input').val();
  let endTime = $('#end-time-input').val();
  
  let length = Math.floor(Number($('#gif-length-input').val()));

  let watermarkPos = $('#watermark-pos-select').val();
  // watermark;


  // input validation
  if (!startTime.match(/^[0-9]+:+[0-9]+:+[0-9]+$/) || !endTime.match(/^[0-9]+:+[0-9]+:+[0-9]+$/) || isNaN(length) || length < 1) {
    console.log("Invalid GIF Config");
    return;
  }




  // parse start and end times
  
  let currentTime = new Date();

  let currentTimeStr = `${(offsetHour(currentTime.getUTCHours(), -5)).toString().padStart(2, '0')}:${currentTime.getUTCMinutes().toString().padStart(2, '0')}:${currentTime.getUTCSeconds().toString().padStart(2, '0')}`;
  console.log(currentTimeStr);

  // Function to convert "hh:mm:ss" to seconds
  function timeToSeconds(timeStr) {
    let [hours, minutes, seconds] = timeStr.split(":").map(Number);
    return hours * 3600 + minutes * 60 + seconds;
  }

  // Convert startTime and endTime to seconds
  let startTimeInSeconds = timeToSeconds(startTime);
  let endTimeInSeconds = timeToSeconds(endTime);
  let currentTimeInSeconds = timeToSeconds(currentTimeStr);

  console.log(`Star time (in secs): ${startTimeInSeconds}`);
  console.log(`End time (in secs): ${endTimeInSeconds}`);
  console.log(`Current time (in secs): ${endTimeInSeconds}`);

  // Calculate the difference in seconds from the current time
  let startTimeOffset = currentTimeInSeconds - startTimeInSeconds;
  let endTimeOffset = currentTimeInSeconds - endTimeInSeconds;

  // Format as "-360seconds" or "-60seconds"
  startTime = `-${startTimeOffset}seconds`;
  endTime = `-${endTimeOffset}seconds`;


  console.log(startTime, endTime)

  if (endTimeOffset > startTimeOffset) {
    console.log("invalid time range");
    return;
  }


  // pull
  const rawData = await fetch(`${backendURL}screenshot?cropBounds=${JSON.stringify(savedBounds)}&videoId=${loadedVideoId}&startTime=${startTime}&endTime=${endTime}&length=${length}&watermark=${watermark}&watermarkPos=${watermarkPos}`);

  // $(`.video-btn`).toggleClass('bg-secondary-hover, bg-secondary');
}



function openDropup(popup) {
  if (pullerBusy) { return; }
  pullerBusy = true;

  $(`.${popup}-dropup`).removeClass('invisible');
  if (popup != 'photo' && popup != 'video') { $(`.${popup}-btn`).toggleClass('bg-secondary-hover, bg-secondary'); }
}
function dismissDropup(popup) {
  $(`.${popup}-dropup`).addClass('invisible');
  $(`.${popup}-btn`).toggleClass('bg-secondary-hover, bg-secondary');

  pullerBusy = false
}



function copyCredits() {
  //  active btn
  $(`.credits-btn`).toggleClass('bg-secondary-hover, bg-secondary');

  
  //  get stream obj from streams array if present
  let streamsObj = streams.filter((stream) => stream.videoId  == loadedVideoId);
  let videoName = streamsObj.length == 1 ? streamsObj[0].videoName : 'STREAM_NAME';

  //  copy to clipboard
  navigator.clipboard.writeText(`[ Credits: [${videoName}](<https://youtube.com/watch?v=${loadedVideoId}>) ]`);


  //  unactive btn
  setTimeout(() => {
    $(`.credits-btn`).toggleClass('bg-secondary-hover, bg-secondary');
  }, 500)
}




function loadStream(value, select) {
  let videoURL;
  let videoId;



  if (select) {
    videoId = value;
  }
  else {
    try {
      videoURL = new URL(value);
  
      const isValidProtocol = videoURL.protocol === 'https:' || videoURL.protocol === 'http:';
      const isYouTubeDomain = videoURL.hostname.includes('youtube.com') || videoURL.hostname.includes('youtu.be');
      const hasVideoId = videoURL.pathname.includes('/live/') || videoURL.searchParams.has('v');
  
      if (!isValidProtocol || !isYouTubeDomain || !hasVideoId) {
        throw 'Invalid URL';
      }
  
      videoId = videoURL.pathname.includes('/live/') ? videoURL.pathname.split('/live/')[1].split('?')[0] : videoURL.searchParams.get('v');
  
      if (videoId == "") { throw 'Invalid URL'; }
  
    } catch (err) {
      console.log('Invalid URL');
      return null;
    }

    $('#load-stream-dropdown').val(videoId);
  }
  

  
  loadedVideoId = videoId;

  //  get watermark from streams array if present
  let streamsObj = streams.filter((stream) => stream.videoId  == loadedVideoId);
  watermark = streamsObj.length == 1 ? streamsObj[0].watermark : '';

  // $('iframe')[0].src = `https://youtube.com/embed/${loadedVideoId}?autoplay=1`;
  player.loadVideoById(loadedVideoId);
  durationTimeUnixS = 0;
  durationOffset = false;
  $('#load-stream-input')[0].value = `https://youtube.com/watch?v=${loadedVideoId}`;
  $('.branding-select')[0].value = watermark;
  $('.branding-select')[1].value = watermark;
}





//  YOUTUBE IFRAME MANAGEMENT


function onYouTubeIframeAPIReady() {
  player = new YT.Player('player', {
    videoId: loadedVideoId,
    playerVars: {
      'autoplay': 1
    },
    events: {
      'onStateChange': onPlayerStateChange
    }
  });
}

function onPlayerReady() {}
function onPlayerStateChange() { durationTimeUnixS = player.getDuration(); }



setInterval(() => {
  if (!player) { return; }


  if (player.getPlayerState() == 1) {
    if (!durationOffset) {
      player.seekTo(player.getDuration());

      setTimeout(()=>{
        player.seekTo(player.getDuration());
      },300);

      durationTimeUnixS = player.getDuration();
      durationOffset = true;
    }

    durationTimeUnixS += 0.1;
  }
}, 100)



$('#set-end-time-to-live-btn').click(() => {
  let currentTime = new Date();
  let currentTimeStr = `${(offsetHour(currentTime.getUTCHours(), -5)).toString().padStart(2, '0')}:${currentTime.getUTCMinutes().toString().padStart(2, '0')}:${currentTime.getUTCSeconds().toString().padStart(2, '0')}`;
  
  $('#end-time-input').val(currentTimeStr);
})