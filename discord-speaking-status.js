listenForDiscordEvents = function (e) {
  let user = game.users.find(u=> u.flags["discord-speaking-status"]?.id == e.data.user_id)
  if (!user) return;
  let tokens = user.character?.getActiveTokens();
  
  const isGMFreeSelection = game.settings.get("discord-speaking-status", "gmFreeSelect");
  if(user.name =='Gamemaster' && isGMFreeSelection){
    tokens = canvas.tokens.controlled;
  }
  
  if (e.data.evt=="SPEAKING_START") {
    tokens.forEach(t => {
      $(`#player-list > li[data-user-id="${user.id}"] span:first-child`).css({outline: '5px solid #3BA53B'});
      t.document.setFlag('discord-speaking-status', 'BorderColor', '3BA53B')
    });
    
  }
  if (e.data.evt=="SPEAKING_STOP") {
    $(`#player-list > li[data-user-id="${user.id}"] span:first-child`).css({outline: 'unset'});
    tokens.forEach(t => { 
      t.document.unsetFlag('discord-speaking-status', 'BorderColor')
    });
  }
}

Hooks.on('ready',()=>{
  window.addEventListener("message", listenForDiscordEvents, false)
});

cleanDiscordSpeakingMarkers = function () {
  $(`#player-list > li span:first-child`).css({outline: 'unset'});
  $('#hud').find(`div.speaking-token-marker`).remove(); 
  $(`#token-action-bar li`).css({outline: 'unset'});
}


colorizeBorder = function (token) {
  
  let borderColor = Color.from(token.document.getFlag('discord-speaking-status', 'BorderColor'))

  if (!borderColor || isNaN(borderColor) ) {
    
    return;
  }

  const thickness = 10; //border thickness
  const sB = 1; //scale border
  const nBS = canvas.dimensions.size / 100 //border grid scale (usually 1)
  const p = 0 // border offfset negative for inside
  const q = Math.round(p / 2)
  const h = Math.round(thickness / 2);
  const o = Math.round(h / 2);
  const s = 1 // scale
  const sW = sB ? (token.w - (token.w * s)) / 2 : 0
  const sH = sB ? (token.h - (token.h * s)) / 2 : 0
  token.border.visible = true
  token.border.lineStyle(h * nBS, borderColor.valueOf(), 1.0).drawRoundedRect(-o - q + sW, -o - q + sH, (token.w + h) * s + p, (token.h + h) * s + p, 3);
 
} 

Hooks.on('refreshToken', (t)=>{

  colorizeBorder(t)
 
	if (t.isPreview) return;
  $(`#hud > div.speaking-token-marker.${t.id}`).css({ top: `${t.y}px`, left: `${t.x}px`});
});

Hooks.on("updateToken", (token, updateData, options, userId) => {
  let tokenObject = token.object
  
  tokenObject.refresh()
});


const unsecuredCopyToClipboard = (text) => { 
  const textArea = document.createElement("textarea"); 
  textArea.value=text; document.body.appendChild(textArea); 
  textArea.focus();textArea.select(); 
  try{
    document.execCommand('copy')
  }
  catch(err){
    console.error('Unable to copy to clipboard',err)
  }
  document.body.removeChild(textArea)
};

openDiscordWindow = async function () {
  let code = "const users = {};\r\nconst log = window.console.log.bind(window.console);\r\nwindow.console.log = (...args) => {\r\n  if (!args[1] || !window.opener)return log(...args);\r\n  if (typeof args[1] !== \'object\') return log(...args);\r\n  let data = args[1].data;\r\n\tdata.evt = args[1].evt;\r\n\tif (data.evt == \"VOICE_STATE_UPDATE\") {\r\n\t\tusers[data.user.id] = `${data.user.username}#${data.user.discriminator}`\r\n\t\treturn console.log(users[data.user.id], \'added to users\', users)\r\n\t}\r\n\tif (![\"SPEAKING_START\", \"SPEAKING_STOP\"].includes(data.evt)) return log(...args);\r\n\tdata.name = users[data.user_id];\r\n\tdata.nick = document.querySelector(`img[src*=\"${data.user_id}\"]`)?.parentElement?.querySelector(\"span\").innerHTML;\r\n\tlog(\'sending this data to window.opener\', data);\r\n  window.opener.postMessage(data, \'*\');\r\n}"
  if (window.isSecureContext ) {
    await window.navigator.clipboard.writeText(code);
  } else {
    unsecuredCopyToClipboard(code);
  }
  channel = game.settings.get("discord-speaking-status", "channel");
  let parts = channel.split('/');
  window.open(`https://streamkit.discord.com/overlay/voice/${parts[4]}/${parts[5]}`)
}
Hooks.once("init", async () => {
  
  game.settings.register('discord-speaking-status', 'channel', {
    name: `Discord Voice Channel URL`,
    hint: `Right click the channel in discord and click "Copy Link"`,
    scope: "world",
    config: true,
    type: String,
    default: "",
    requiresReload: false
  });
  
  game.settings.register('discord-speaking-status', 'gmFreeSelect', {
    name: `GM free selection`,
    hint: `Game master can pick any token and it will brink when speak`,
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    requiresReload: false
  });

});

Hooks.on('renderSettings', (app, html)=>{
  html.find('#settings-access').prepend($(`<button><i class="fa-brands fa-discord"></i> Open Discord StreamKit</button>`).click(function(){openDiscordWindow()}))
})

Hooks.on('controlToken', (token,controlled)=>{
  if(!controlled){
    let borderColor = Color.from(token.document.getFlag('discord-speaking-status', 'BorderColor'))
    if (!borderColor || isNaN(borderColor) ) {
      return;
    }
    token.document.unsetFlag('discord-speaking-status', 'BorderColor')
  }
})


Hooks.on('renderUserConfig', renderUserConfig);

function renderUserConfig(app, html) {
  const PCDisplay = html.querySelector("fieldset:nth-child(2)");
  const cardSelect = document.createElement("fieldset");
  const legend = document.createElement("legend");
  legend.innerHTML = "Discord speaking status"
  PCDisplay.after(cardSelect);

  cardSelect.prepend(legend);

  /** @type {User} */
  const user = app.document;
  const handId = user.getFlag('discord-speaking-status', "id");
  const handSelect = foundry.applications.fields.createTextInput({
    name: `flags.discord-speaking-status.id`,
    value: handId,
    blank: ""
  });

  const handSelectGroup = foundry.applications.fields.createFormGroup({
    label: "test",
    localize: false,
    input: handSelect
  });

  cardSelect.append(handSelectGroup);

}