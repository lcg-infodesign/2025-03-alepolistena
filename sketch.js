// Margine esterno per non disegnare sui bordi del canvas
let outerMargin = 100;

// Variabile che conterrà i dati caricati dal CSV
let data;

// Variabili globali per i limiti delle scale
let minLon, maxLon, minLat, maxLat;

// Variabile per memorizzare il vulcano cliccato per mostrare la legenda
let selectedVolcano = null;
let hoveredVolcano = null; // Variabile per tracciare il vulcano in hover

// Stato della legenda
let isLegendOpen = false;

// Variabili per il pulsante della legenda
let legendToggleRect = {};

// Mappa dei colori dinamica che verrà popolata in setup()
let volcanoColors = {};

// Costanti di stile
const VOLCANO_SIZE = 10;
const HOVER_COLOR = [255, 0, 0]; // Rosso (Riservato a hover e selezione)

// Colori di base definiti manualmente che avranno la precedenza
const predefinedColors = {
    // Tipi Sottomarini (come richiesto)
    "Submarine volcano": [0, 150, 255],  // Azzurro
    
    // Altri tipi chiave
    "Stratovolcano": [150, 75, 0],       // Marrone Scuro
    "Shield volcano": [0, 150, 0],       // Verde Scuro
    "Caldera": [255, 140, 0],            // Arancione Scuro
    "Sconosciuto": [50, 50, 50]          // Grigio Scuro (Default per tipi mancanti)
};

// Tavolozza di colori contrastanti per l'assegnazione dinamica
const fallbackColors = [
    [255, 105, 180], // Rosa Shocking
    [100, 100, 255], // Blu Medio
    [255, 200, 0],   // Giallo brillante
    [165, 42, 42],   // Marrone Rosso
    [0, 200, 200],   // Ciano
    [128, 0, 128],   // Viola
    [200, 100, 50],  // Arancio Mattone
    [180, 180, 180], // Grigio Chiaro
    [70, 130, 180],  // Blu Acciaio
    [50, 150, 150],  // Verde Acqua
    [255, 69, 0],    // Rosso-Arancio
];

// Array per tenere traccia dei tipi unici presenti nel dataset (per la legenda)
let uniqueTypes = new Set();


function preload() {
    // Carica il file CSV chiamato "vulcani.csv"
    data = loadTable("vulcani.csv", "csv", "header");
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    noStroke();
    
    // --- DEFINIZIONE DELLE SCALE ---
    let allLon = data.getColumn("Longitude");
    minLon = min(allLon);
    maxLon = max(allLon);

    let allLat = data.getColumn("Latitude");
    minLat = min(allLat);
    maxLat = max(allLat);
    
    // --- MAPPATURA COLORI DINAMICA ---
    let colorIndex = 0;
    
    // 1. Popola i tipi unici e assegna i colori
    for (let i = 0; i < data.getRowCount(); i++) {
        let row = data.getRow(i);
        let tipo = row.getString("Type");
        
        if (tipo) {
            uniqueTypes.add(tipo);
            
            // Se il tipo non è ancora nella mappa (né predefinito né assegnato), assegna un colore
            if (!volcanoColors[tipo]) {
                if (predefinedColors[tipo]) {
                    // Usa il colore predefinito
                    volcanoColors[tipo] = predefinedColors[tipo];
                } else {
                    // Assegna dinamicamente un colore dalla tavolozza fallback
                    volcanoColors[tipo] = fallbackColors[colorIndex % fallbackColors.length];
                    colorIndex++;
                }
            }
        }
    }
    
    // Assicurati che il colore di fallback "Sconosciuto" sia definito
    volcanoColors["Sconosciuto"] = predefinedColors["Sconosciuto"];
}

function draw() {
    // Sfondo nero
    background(10);

    hoveredVolcano = null;
    let closestDist = Infinity;

    // --- FASE 1: Disegno dei Vulcani e Rilevamento Interattività ---
    for (let i = 0; i < data.getRowCount(); i++) {
        let row = data.getRow(i);
        
        let lon = row.getNum("Longitude");
        let lat = row.getNum("Latitude");
        let nome = row.getString("Volcano Name"); 
        let tipo = row.getString("Type");         
        
        // Mappatura delle coordinate
        let x = map(lon, minLon, maxLon, outerMargin, width - outerMargin);
        let y = map(lat, minLat, maxLat, height - outerMargin, outerMargin);

        // Calcola la distanza del mouse dal vulcano
        let d = dist(mouseX, mouseY, x, y);

        // Determina il colore di base
        let defaultColor = volcanoColors[tipo] || volcanoColors["Sconosciuto"];
        
        // Controlla se il mouse è sopra il vulcano
        let isHovering = d < VOLCANO_SIZE / 2;
        
        if (isHovering) {
            fill(HOVER_COLOR); // Rosso in hover
            if (d < closestDist) {
                closestDist = d;
                hoveredVolcano = {
                    index: i,
                    x: x,
                    y: y,
                    nome: nome,
                    tipo: tipo
                };
            }
        } else if (selectedVolcano && selectedVolcano.index === i) {
             fill(HOVER_COLOR); // Rosso se è il vulcano selezionato
        } else {
            fill(defaultColor); // Colore basato sulla categoria (ora assegnato dinamicamente)
        }

        // Disegna il triangolo
        triangle(
            x, y - VOLCANO_SIZE,             
            x - VOLCANO_SIZE / 2, y + VOLCANO_SIZE / 2, 
            x + VOLCANO_SIZE / 2, y + VOLCANO_SIZE / 2  
        );
    }
    
    // --- FASE 2: Disegno Titolo e Legende ---
    
    drawTitle("Mappa Interattiva dei Vulcani Globali (Classificazione: Tipo)");
    
    // Disegna la legenda del vulcano selezionato
    if (selectedVolcano) {
        let bgColor = (hoveredVolcano && hoveredVolcano.index === selectedVolcano.index) ? HOVER_COLOR : volcanoColors[selectedVolcano.tipo] || volcanoColors["Sconosciuto"];
        drawVolcanoLegend(selectedVolcano.nome, selectedVolcano.tipo, selectedVolcano.x, selectedVolcano.y, bgColor);
    }
    
    // Disegna la legenda a tendina
    drawLegendToggle();
    if (isLegendOpen) {
        drawLegendContent();
    }
}

// Funzione chiamata al momento del click del mouse
function mouseClicked() {
    // 1. Controlla il click sul pulsante della legenda
    if (mouseX > legendToggleRect.x && mouseX < legendToggleRect.x + legendToggleRect.w &&
        mouseY > legendToggleRect.y && mouseY < legendToggleRect.y + legendToggleRect.h) {
        isLegendOpen = !isLegendOpen;
        // Impedisce di selezionare un vulcano se si clicca sul pulsante della legenda
        return; 
    }

    // 2. Controlla il click sul vulcano
    if (hoveredVolcano) {
        if (selectedVolcano && selectedVolcano.index === hoveredVolcano.index) {
            selectedVolcano = null;
        } else {
            selectedVolcano = { ...hoveredVolcano };
        }
    } else {
        selectedVolcano = null;
    }
}

// Funzione per disegnare il Titolo
function drawTitle(titleText) {
    fill(255);
    textAlign(CENTER, TOP);
    textSize(32);
    textStyle(BOLD);
    text(titleText, width / 2, 20);
    textStyle(NORMAL);
}

// Funzione per disegnare la legenda del vulcano al click
function drawVolcanoLegend(nome, tipo, x, y, bgColor) {
    let boxWidth = 180;
    let boxHeight = 60;
    let offsetX = 15;
    let offsetY = -80;
    
    // Accento colorato
    fill(bgColor); 
    rect(x + offsetX - 2, y + offsetY - 2, 5, boxHeight + 4, 3);
    
    // Rettangolo principale della legenda
    fill(255, 255, 255, 240); 
    stroke(50); 
    strokeWeight(1);
    rect(x + offsetX, y + offsetY, boxWidth, boxHeight, 5);
    noStroke();
    
    // Testo
    fill(0);
    textSize(14);
    textAlign(LEFT, TOP);
    
    textStyle(BOLD);
    text(nome, x + offsetX + 10, y + offsetY + 8, boxWidth - 20, 20);
    
    textStyle(NORMAL);
    textSize(12);
    text("Tipo: " + tipo, x + offsetX + 10, y + offsetY + 35);
}

// Funzione per disegnare il pulsante di attivazione della legenda
function drawLegendToggle() {
    let padding = 20;
    let boxWidth = 240;
    let boxHeight = 40;
    let startX = width - boxWidth - padding;
    let startY = height - padding - boxHeight;

    // Aggiorna le dimensioni del rettangolo per il rilevamento del click
    legendToggleRect = { x: startX, y: startY, w: boxWidth, h: boxHeight };

    // Stile del pulsante
    let isHovering = mouseX > startX && mouseX < startX + boxWidth && 
                     mouseY > startY && mouseY < startY + boxHeight;

    fill(isHovering ? [50, 50, 50, 220] : [10, 10, 10, 220]); 
    rect(startX, startY, boxWidth, boxHeight, 5);

    // Testo del pulsante
    fill(255);
    textAlign(LEFT, CENTER);
    textSize(16);
    textStyle(BOLD);
    
    let indicator = isLegendOpen ? '▲' : '▼'; // Indicatore a tendina
    let textContent = "Legenda Categorie (Tipo) " + indicator;

    text(textContent, startX + 10, startY + boxHeight / 2);
    textStyle(NORMAL);
}

// Funzione per disegnare il contenuto dettagliato della legenda
function drawLegendContent() {
    let padding = 20;
    let boxWidth = 240;
    let itemHeight = 20;
    let titleHeight = 5; // Spazio tra pulsante e contenuto
    
    // Calcola l'altezza totale necessaria per tutti i tipi unici + la voce hover
    let contentHeight = (uniqueTypes.size + 1) * itemHeight + titleHeight;
    
    // Posizione di partenza per il contenuto (sopra il pulsante)
    let startX = width - boxWidth - padding;
    let startY = height - padding - legendToggleRect.h - contentHeight; 
    
    // Sfondo semi-trasparente per la legenda
    fill(10, 10, 10, 200);
    rect(startX, startY, boxWidth, contentHeight + 10, 5);

    let currentY = startY + 10;
    let i = 0;
    
    // La Set 'uniqueTypes' contiene solo i tipi presenti nel dataset
    // Usiamo Array.from() per iterare su un array ordinato per l'elenco della legenda
    Array.from(uniqueTypes).sort().forEach(tipo => {
        let colorArray = volcanoColors[tipo] || volcanoColors["Sconosciuto"];
        
        // Disegna il campione di colore (quadrato)
        fill(colorArray);
        rect(startX + 10, currentY + i * itemHeight, 15, 15);
        
        // Scrivi il nome della categoria
        fill(255);
        textSize(12);
        textAlign(LEFT, TOP);
        text(tipo, startX + 35, currentY + i * itemHeight + 2);
        
        i++;
    });
    
    // Aggiungi l'indicazione per Hover/Select
    fill(HOVER_COLOR);
    rect(startX + 10, currentY + i * itemHeight, 15, 15);
    fill(255);
    text("Hover / Selezionato", startX + 35, currentY + i * itemHeight + 2);
}