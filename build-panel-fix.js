const fs = require('fs');

const source = 'https://raw.githubusercontent.com/vilateriaserviali-creator/cineora/aa69dcd727d820b4c6079bc3d8c9e55f1ac91a45/index.html';

const css = `<style id="cineora-compact-right-panel-v1">
.room-view.show .room-layout{grid-template-columns:minmax(0,1fr) 390px!important;gap:20px!important;align-items:stretch!important}
.room-view.show .side-card{width:390px!important;min-width:390px!important;max-width:390px!important;height:calc(100vh - 100px)!important;min-height:520px!important;max-height:none!important;display:flex!important;flex-direction:column!important;overflow:hidden!important;position:sticky!important;top:84px!important}
.room-view.show .side-card>.participants-title-row{flex:0 0 42px!important;min-height:42px!important;height:42px!important;padding:10px 14px 7px!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:8px!important;white-space:nowrap!important;overflow:hidden!important;border-bottom:1px solid #e1dbe1!important}
.room-view.show .side-card>.participants-title-row>span:first-child{min-width:0!important;overflow:hidden!important;text-overflow:ellipsis!important}.room-view.show .room-sync-indicator{flex:0 0 auto!important;font-size:9px!important;white-space:nowrap!important}
.room-view.show .side-card>.participants{flex:0 0 auto!important;height:auto!important;min-height:0!important;max-height:150px!important;padding:7px 12px 9px!important;gap:5px!important;overflow-y:auto!important;overflow-x:hidden!important;border-bottom:1px solid #e1dbe1!important}
.room-view.show .side-card .participant-card,.room-view.show .side-card .person-row{min-height:42px!important;height:42px!important;padding:6px 9px!important;border-radius:10px!important;flex:0 0 42px!important}
.room-view.show .side-card .participant-avatar{width:32px!important;height:32px!important;min-width:32px!important;font-size:14px!important}
.room-view.show .side-card .participant-name-line,.room-view.show .side-card .participant-info{min-width:0!important;overflow:hidden!important}.room-view.show .side-card .participant-name-line>*{min-width:0!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}
.room-view.show .side-card>.voice-panel{flex:0 0 82px!important;height:82px!important;min-height:82px!important;max-height:82px!important;padding:8px 10px!important;border-top:0!important;border-bottom:1px solid #e1dbe1!important;overflow:hidden!important}
.room-view.show .side-card .voice-head{height:38px!important;align-items:flex-start!important;gap:7px!important}.room-view.show .side-card .voice-title{font-size:13px!important;line-height:1.15!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}.room-view.show .side-card .voice-status{margin-top:2px!important;font-size:9px!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}.room-view.show .side-card .voice-toggle{flex:0 0 auto!important;padding:6px 9px!important;font-size:9px!important;line-height:1!important;border-radius:9px!important;max-width:145px!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}.room-view.show .side-card .voice-tools{height:27px!important;margin-top:3px!important;gap:6px!important;overflow:hidden!important}.room-view.show .side-card .noise-option,.room-view.show .side-card .voice-note{font-size:8px!important;line-height:1!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
.room-view.show .side-card>.chat{flex:1 1 auto!important;min-height:0!important;height:auto!important;max-height:none!important;display:flex!important;flex-direction:column!important;overflow:hidden!important;border-top:0!important}.room-view.show .side-card .chat-title-row{flex:0 0 42px!important;min-height:42px!important;height:42px!important;padding:10px 14px 7px!important;border-bottom:1px solid #e1dbe1!important}.room-view.show .side-card .chat-title-row .side-title{font-size:17px!important;padding:0!important;white-space:nowrap!important}.room-view.show .side-card .chat-messages{flex:1 1 auto!important;min-height:0!important;height:auto!important;max-height:none!important;overflow-y:auto!important;overflow-x:hidden!important}.room-view.show .side-card .chat-form{flex:0 0 58px!important;height:58px!important;min-height:58px!important;max-height:58px!important;padding:8px!important;overflow:visible!important}.room-view.show .side-card .chat-form input{min-width:0!important;overflow:hidden!important;text-overflow:ellipsis!important}
@media(max-width:1000px){.room-view.show .room-layout{grid-template-columns:1fr!important;gap:12px!important}.room-view.show .side-card{width:100%!important;min-width:0!important;max-width:none!important;position:static!important;height:auto!important;min-height:0!important;max-height:none!important}.room-view.show .side-card>.participants{max-height:150px!important}.room-view.show .side-card>.voice-panel{height:82px!important;min-height:82px!important;max-height:82px!important}.room-view.show .side-card>.chat{height:440px!important;min-height:440px!important;max-height:none!important}}
@media(max-width:600px){.room-view.show .side-card .voice-toggle{max-width:120px!important;font-size:8px!important}.room-view.show .side-card>.chat{height:420px!important;min-height:420px!important}}
</style>`;

async function run() {
  const response = await fetch(source, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Failed to restore CINEORA index: HTTP ${response.status}`);
  let html = await response.text();
  if (!html.includes('</head>')) throw new Error('Restored index.html has no </head>');
  html = html.replace('</head>', css + '\n</head>');
  fs.writeFileSync('index.html', html, 'utf8');
  console.log('CINEORA index restored and compact right panel CSS applied.');
}

run().catch(err => { console.error(err); process.exit(1); });
