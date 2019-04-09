const $h2 = document.querySelector('h2');
const $p = document.querySelector('p');
const $run = document.querySelector('#run');
const $start = document.querySelector('#start');
const $stop = document.querySelector('#stop');
const $kill = document.querySelector('#kill');
const $restart = document.querySelector('#restart');
const $pause = document.querySelector('#pause');
const $unpause = document.querySelector('#unpause');
const $remove = document.querySelector('#remove');
const $logs = document.querySelector('#logs');
const $download = document.querySelector('#download');
const $upload = document.querySelector('#upload');
const $state = document.querySelector('#state tbody');
const $policy = document.querySelector('#policy tbody');
const $mounts = document.querySelector('#mounts tbody');
const $env = document.querySelector('#env tbody');
const $cmd = document.querySelector('#cmd tbody');
var options = {};



function stateCount(id, cs) {
  var total = 0, created = 0, running = 0, exited = 0;
  for(var c of cs) {
    var s = c.status;
    if(c.image!==id) continue;
    if(s==='created') created++;
    if(s==='running') running++;
    else if(s==='exited') exited++;
    total++;
  }
  return {total, created, running, exited};
}

function searchParse(search) {
  var search = search.substring(1);
  return search? JSON.parse('{"' + decodeURI(search).replace(/"/g, '\\"')
  .replace(/&/g, '","').replace(/=/g,'":"') + '"}'):{};
}

function onReady() {
  var o = searchParse(location.search);
  console.log('onReady()', o);
  $upload.setAttribute('href', `/upload.html?image=${o.image}&from=${o.from}&update=1`);
  $logs.setAttribute('href', `/logs.html?image=${o.image}&from=${o.from}`);
  return o;
}

async function request(o) {
  console.log('request()', o);
  var name = o.image;
  var _i = m.request({method: 'GET', url: `/image/${name}/config`});
  var _cs = m.request({method: 'GET', url: '/container'});
  var [i, cs] = await Promise.all([_i, _cs]);
  var {total, created, running, exited} = stateCount(name, cs);
  m.render($h2, [i.id, m('div', m('small', i.from))]);
  m.render($state, m('tr', [
    m('td', moment(i.created).fromNow()), m('td', running),
    m('td', exited), m('td', created), m('td', total),
  ]));
  m.render($policy, m('tr', [
    m('td', i.workdir),
    m('td', (i.expose||[]).map(v => m('tag', v))),
    m('td', `${i.copyfs}`),
  ]));
  m.render($mounts, (i.mounts||[]).map(v => m('tr', [
    m('td', v.type), m('td', v.source), m('td', v.target),
  ])));
  m.render($env, Object.keys(i.env||{}).map(k => m('tr', [
    m('td', k), m('td', i.env[k]),
  ])));
  m.render($cmd, (i.cmd||[]).map(v => m('tr', m('td',
    m('pre', v.replace(/;\s*/g, ';\n')
  )))));
}

function onRun(o) {
  m.request({method: 'POST', url: `/image/${o.image}/run`}).then((data) => {
    iziToast.success({message: `Ran image ${o.image} as ${data.name}`});
  }, (err) => iziToast.error({message: err.message}));
  return false;
}

function onButton(o, fn, pre, method='POST') {
  m.request({method, url: `/image/${o.image}/${fn}`}).then((data) => {
    iziToast.success({message: `${pre} image ${o.image}`});
  }, (err) => iziToast.error({message: err.message}));
  return false;
}



options = onReady();
request(options);
setInterval(() => request(options).catch(err => {
  $p.innerHTML = err? err.message:'';
}), 1000);
$run.onclick = () => onRun(options);
$start.onclick = () => onButton(options, 'start', 'started');
$stop.onclick = () => onButton(options, 'stop', 'Stopped');
$kill.onclick = () => onButton(options, 'kill', 'Killed');
$restart.onclick = () => onButton(options, 'restart', 'Restarted');
$pause.onclick = () => onButton(options, 'pause', 'Paused');
$unpause.onclick = () => onButton(options, 'unpause', 'Unpaused');
$remove.onclick = () => onButton(options, '', 'Removed', 'DELETE');
