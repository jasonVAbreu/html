// ====== helpers ======
const $ = (s) => document.querySelector(s);
const canvas = $("#canvas");
let selected = null;
let zCounter = 10; // gestionar orden

function px(n){ return `${Math.round(n)}px`; }

function select(item){
  if(selected) selected.classList.remove("selected");
  selected = item || null;
  if(selected) selected.classList.add("selected");
  updateInspector();
}

function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }

// ====== Canvas controls ======
$("#applyCanvas").addEventListener("click", ()=>{
  const w = +$("#canvasWidth").value || 900;
  const h = +$("#canvasHeight").value || 600;
  const bg = $("#canvasBg").value || "#ffffff";
  canvas.style.width = px(w);
  canvas.style.height = px(h);
  canvas.style.background = bg;
});

$("#canvasBg").addEventListener("input",(e)=>{
  canvas.style.background = e.target.value || "#ffffff";
});

$("#clearCanvas").addEventListener("click", ()=>{
  canvas.innerHTML = "";
  select(null);
});

// ====== Crear items ======
function createItem(kind, opts={}){
  const item = document.createElement("div");
  item.className = "item";
  item.dataset.item = "1";
  item.dataset.kind = kind;

  // tamaño/posición por defecto
  item.style.left = px(opts.left ?? 80);
  item.style.top  = px(opts.top ?? 80);
  item.style.width  = px(opts.width ?? (kind==="image" ? 260 : 240));
  item.style.height = px(opts.height ?? (kind==="text" ? 120 : 160));
  item.style.zIndex = ++zCounter;
  item.style.opacity = 1;

  const handle = document.createElement("div");
  handle.className = "drag-handle";
  handle.textContent = "⇕ mover";
  item.appendChild(handle);

  const content = document.createElement("div");
  content.className = "content";
  item.appendChild(content);

  if(kind === "rect"){
    // rectángulo = DIV con fondo configurable
    item.style.background = "#4aa3ff";
    item.style.borderRadius = "8px";
  } else if(kind === "circle"){
    item.style.background = "#7dd3fc";
    item.style.borderRadius = "999px";
  } else if(kind === "text"){
    const t = document.createElement("div");
    t.className = "text";
    t.contentEditable = "true";
    t.textContent = opts.text || "Escribe aquí…";
    t.style.color = "#111111";
    t.style.fontFamily = "Arial, Helvetica, sans-serif";
    t.style.fontSize = "28px";
    content.appendChild(t);
  } else if(kind === "image"){
    const img = document.createElement("img");
    img.src = opts.url || "";
    content.appendChild(img);
  } else if(kind === "html"){
    // insertar HTML crudo (sanitizado antes)
    content.innerHTML = opts.html || "<div>Bloque HTML</div>";
  }

  // eventos
  makeSelectable(item);
  makeDraggable(item, handle);

  canvas.appendChild(item);
  select(item);
  return item;
}

function makeSelectable(item){
  item.addEventListener("mousedown", (e)=>{
    // si hacen clic en inputs dentro del contenido, no cambiar selección
    if(e.target.closest("input, textarea, select")) return;
    select(item);
  });
}

function makeDraggable(item, handle){
  let startX=0, startY=0, startLeft=0, startTop=0;
  const onDown = (e)=>{
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    startX = e.clientX;
    startY = e.clientY;
    startLeft = parseFloat(item.style.left) || 0;
    startTop  = parseFloat(item.style.top) || 0;

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };
  const onMove = (e)=>{
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const newL = startLeft + dx;
    const newT = startTop + dy;
    // limitar dentro del lienzo
    const maxL = canvas.clientWidth - item.clientWidth;
    const maxT = canvas.clientHeight - item.clientHeight;
    item.style.left = px(clamp(newL, 0, Math.max(0,maxL)));
    item.style.top  = px(clamp(newT, 0, Math.max(0,maxT)));
    if(selected===item) updateInspector();
  };
  const onUp = ()=>{
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
  };

  // Arrastre solo por la barra (así puedes escribir en el texto sin que se mueva)
  handle.addEventListener("mousedown", onDown);

  // Al terminar un resize manual, actualizamos props
  item.addEventListener("mouseup", ()=>{
    if(selected===item) updateInspector();
  });
}

// ====== Botones de agregar ======
$("#addRect").addEventListener("click", ()=> createItem("rect"));
$("#addCircle").addEventListener("click", ()=> createItem("circle"));
$("#addText").addEventListener("click", ()=> createItem("text"));
$("#addImage").addEventListener("click", ()=>{
  const url = $("#imgUrl").value.trim();
  if(!url){ alert("Coloca una URL de imagen."); return; }
  createItem("image", { url });
});

// ====== Orden y eliminar ======
$("#bringFront").addEventListener("click", ()=>{
  if(!selected) return;
  selected.style.zIndex = ++zCounter;
});
$("#sendBack").addEventListener("click", ()=>{
  if(!selected) return;
  selected.style.zIndex = 1; // al fondo relativo
});
$("#deleteItem").addEventListener("click", ()=>{
  if(!selected) return;
  selected.remove();
  select(null);
});
document.addEventListener("keydown", (e)=>{
  if(!selected) return;
  if(e.key==="Delete" || e.key==="Backspace"){
    selected.remove(); select(null);
  }
});

// ====== Inspector ======
const prop = {
  noSel: $("#noSel"), panel: $("#props"),
  posX: $("#posX"), posY: $("#posY"),
  w: $("#propW"), h: $("#propH"),
  bg: $("#bgColor"), bgImg: $("#bgImage"),
  bdColor: $("#bdColor"), bdWidth: $("#bdWidth"), bdRadius: $("#bdRadius"),
  opacity: $("#opacity"),
  fontSize: $("#fontSize"), fontColor: $("#fontColor"),
  fontFamily: $("#fontFamily"), fontWeight: $("#fontWeight"),
  textBlock: $("#textBlock")
};

function updateInspector(){
  if(!selected){
    prop.panel.classList.add("hidden");
    prop.noSel.classList.remove("hidden");
    return;
  }
  prop.noSel.classList.add("hidden");
  prop.panel.classList.remove("hidden");

  prop.posX.value = parseInt(selected.style.left) || 0;
  prop.posY.value = parseInt(selected.style.top) || 0;
  prop.w.value = parseInt(selected.style.width) || selected.clientWidth;
  prop.h.value = parseInt(selected.style.height) || selected.clientHeight;
  prop.bg.value = cssColorToHex(selected.style.backgroundColor || "#ffffff");
  prop.bgImg.value = getBackgroundImageURL(selected);

  prop.bdColor.value = cssColorToHex(selected.style.borderColor || "#1e293b");
  prop.bdWidth.value = parseInt(selected.style.borderWidth) || 0;
  prop.bdRadius.value = parseInt(selected.style.borderRadius) || 0;
  prop.opacity.value = parseFloat(selected.style.opacity || 1);

  const isText = selected.dataset.kind === "text";
  prop.textBlock.open = isText;
  prop.textBlock.style.display = isText ? "block" : "none";
  if(isText){
    const t = selected.querySelector(".text");
    prop.fontSize.value = parseInt(t.style.fontSize || 28);
    prop.fontColor.value = cssColorToHex(t.style.color || "#111111");
    prop.fontFamily.value = t.style.fontFamily || "Arial, Helvetica, sans-serif";
    prop.fontWeight.value = t.style.fontWeight || "400";
  }
}

// aplicar cambios
[prop.posX, prop.posY, prop.w, prop.h].forEach(inp=>{
  inp.addEventListener("input", ()=>{
    if(!selected) return;
    selected.style.left = px(+prop.posX.value || 0);
    selected.style.top  = px(+prop.posY.value || 0);
    selected.style.width  = px(Math.max(+prop.w.value || 10, 10));
    selected.style.height = px(Math.max(+prop.h.value || 10, 10));
  });
});
prop.bg.addEventListener("input", ()=>{
  if(!selected) return;
  selected.style.backgroundImage = ""; // limpiar patrón si había
  selected.style.backgroundColor = prop.bg.value;
});
prop.bgImg.addEventListener("change", ()=>{
  if(!selected) return;
  const url = prop.bgImg.value.trim();
  if(url){
    selected.style.backgroundImage = `url("${url}")`;
    selected.style.backgroundSize = "cover";
    selected.style.backgroundPosition = "center";
  } else {
    selected.style.backgroundImage = "";
  }
});
[prop.bdColor, prop.bdWidth, prop.bdRadius].forEach(inp=>{
  inp.addEventListener("input", ()=>{
    if(!selected) return;
    selected.style.borderColor = prop.bdColor.value;
    selected.style.borderStyle = (+prop.bdWidth.value>0) ? "solid" : "none";
    selected.style.borderWidth = px(+prop.bdWidth.value || 0);
    selected.style.borderRadius = px(+prop.bdRadius.value || 0);
  });
});
prop.opacity.addEventListener("input", ()=>{
  if(!selected) return;
  selected.style.opacity = +prop.opacity.value;
});

// texto
[prop.fontSize, prop.fontColor, prop.fontFamily, prop.fontWeight].forEach(inp=>{
  inp.addEventListener("input", ()=>{
    if(!selected || selected.dataset.kind!=="text") return;
    const t = selected.querySelector(".text");
    t.style.fontSize = px(+prop.fontSize.value || 12);
    t.style.color = prop.fontColor.value;
    t.style.fontFamily = prop.fontFamily.value;
    t.style.fontWeight = prop.fontWeight.value;
  });
});

// ====== Panel de código HTML ======
function sanitizeHTML(html){
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  // quitar scripts y on* attrs
  doc.querySelectorAll("script").forEach(n=>n.remove());
  doc.querySelectorAll("*").forEach(el=>{
    [...el.attributes].forEach(a=>{
      if(/^on/i.test(a.name)) el.removeAttribute(a.name);
    });
  });
  return doc.body.innerHTML;
}
function getBackgroundImageURL(el){
  const bg = getComputedStyle(el).backgroundImage; // url("...") o none
  if(!bg || bg==="none") return "";
  const m = bg.match(/url\(["']?(.*?)["']?\)/);
  return m ? m[1] : "";
}

$("#refreshFromCanvas").addEventListener("click", ()=>{
  $("#htmlCode").value = canvas.innerHTML.trim();
});

$("#insertHTML").addEventListener("click", ()=>{
  const raw = $("#htmlCode").value.trim();
  if(!raw){ alert("Pega HTML primero."); return; }
  const safe = sanitizeHTML(raw);
  createItem("html", { html: safe, left: 50 + (Math.random()*60|0), top: 50 + (Math.random()*60|0), width: 300, height: 200 });
});

$("#replaceCanvas").addEventListener("click", ()=>{
  const raw = $("#htmlCode").value.trim();
  if(!raw){ alert("Pega HTML para reemplazar el lienzo."); return; }
  const safe = sanitizeHTML(raw);
  // parsear y envolver cada top-level en item movible
  const tmp = document.createElement("div");
  tmp.innerHTML = safe;
  canvas.innerHTML = "";
  [...tmp.children].forEach((node, i)=>{
    const it = createItem("html", { html: node.outerHTML, left: 40+ i*20, top: 40+ i*20, width: node.clientWidth || 320, height: node.clientHeight || 200 });
    // Nota: outerHTML quedó dentro; si el nodo tenía estilos inline, se respetan.
  });
  $("#htmlCode").value = canvas.innerHTML.trim();
});

// ====== Guardar como HTML (estático) ======
$("#saveHTML").addEventListener("click", ()=>{
  // generamos un HTML estático con el canvas tal como se ve (sin scripts del editor)
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const bg = getComputedStyle(canvas).background;

  const html =
`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Proyecto</title>
<style>
  body{margin:0;background:#f6f8fb}
  .canvas{position:relative;margin:16px auto;border:1px dashed #cbd5e1}
  .item{position:absolute;overflow:hidden}
  .item .drag-handle{display:none} /* oculto en versión exportada */
  .item .content{position:absolute;left:0;right:0;top:0;bottom:0;padding:.5rem;overflow:auto}
  .item[data-kind="image"] .content{padding:0}
  .item .text{min-width:120px;min-height:60px;line-height:1.3}
</style>
</head>
<body>
<div class="canvas" style="width:${px(w)};height:${px(h)};background:${bg};">
${canvas.innerHTML}
</div>
</body></html>`;

  const blob = new Blob([html], {type:"text/html;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "proyecto.html"; a.click();
  URL.revokeObjectURL(url);
});

// ====== UX: deselección clic vacío ======
canvas.addEventListener("mousedown", (e)=>{
  if(e.target === canvas) select(null);
});

// ====== Atajos ======
document.addEventListener("keydown", (e)=>{
  if(!selected) return;
  const step = (e.shiftKey ? 10 : 2);
  if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)){
    e.preventDefault();
    const x = parseInt(selected.style.left)||0;
    const y = parseInt(selected.style.top)||0;
    if(e.key==="ArrowLeft") selected.style.left = px(Math.max(0, x-step));
    if(e.key==="ArrowRight") selected.style.left = px(x+step);
    if(e.key==="ArrowUp") selected.style.top = px(Math.max(0, y-step));
    if(e.key==="ArrowDown") selected.style.top = px(y+step);
    updateInspector();
  }
});

// util col hex
function cssColorToHex(c){
  if(!c) return "#000000";
  if(c.startsWith("#")) return c;
  const ctx = document.createElement("canvas").getContext("2d");
  ctx.fillStyle = c;
  const comp = ctx.fillStyle; // estandariza
  if(comp.startsWith("#")) return comp;
  // rgb(...)
  const m = comp.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if(!m) return "#000000";
  const toHex = (n)=> parseInt(n).toString(16).padStart(2,"0");
  return `#${toHex(m[1])}${toHex(m[2])}${toHex(m[3])}`;
}
