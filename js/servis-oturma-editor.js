/* ============================================================================
   SERVIS YERLEŞIM EDITÖRÜ - Vanilla JavaScript Motoru
   ============================================================================
   Tamamen dinamik, Firestore entegre, sürükle-bırak yapılı
   ============================================================================ */

// Global state management
const ServisYerlesimiEditor = {
  // Durum bilgisi
  state: {
    serviceId: null,
    serviceName: '',
    driverName: '',
    vehicleModel: '',
    vehicleType: 'fiatDucato',
    totalSeats: 0,
    filledSeats: 0,
    capacity: 0,
    editMode: false,
    currentData: {
      elements: [], // Tüm elemanlar (koltuk, kapı, koridor vb.)
      rows: []      // Satır yapısı
    },
    selectedSeat: null,
    draggedElement: null,
    history: [],
    historyIndex: -1,
    studentList: [], // Firestore'dan gelen öğrenci listesi
  },

  // Araç şablonları
  vehicleTemplates: {
    fiatDucato: {
      name: 'Fiat Ducato',
      seats: 16,
      layout: [
        { type: 'driver', row: 0, cols: 1 },
        { type: 'door', row: 0, cols: 1 },
        { type: 'row', seatCount: 2, arrangement: 'pair' },
        { type: 'row', seatCount: 2, arrangement: 'pair' },
        { type: 'row', seatCount: 2, arrangement: 'pair' },
        { type: 'row', seatCount: 2, arrangement: 'pair' },
        { type: 'row', seatCount: 2, arrangement: 'pair' },
        { type: 'row', seatCount: 2, arrangement: 'pair' },
        { type: 'row', seatCount: 2, arrangement: 'pair' },
        { type: 'row', seatCount: 2, arrangement: 'pair' }
      ]
    },
    fordTransit: {
      name: 'Ford Transit',
      seats: 17,
      layout: [
        { type: 'driver', row: 0, cols: 1 },
        { type: 'door', row: 0, cols: 1 },
        { type: 'row', seatCount: 3, arrangement: 'triple' },
        { type: 'row', seatCount: 3, arrangement: 'triple' },
        { type: 'row', seatCount: 3, arrangement: 'triple' },
        { type: 'row', seatCount: 3, arrangement: 'triple' },
        { type: 'row', seatCount: 2, arrangement: 'pair' }
      ]
    },
    mercedesSprinter: {
      name: 'Mercedes Sprinter',
      seats: 18,
      layout: [
        { type: 'driver', row: 0, cols: 1 },
        { type: 'door', row: 0, cols: 1 },
        { type: 'row', seatCount: 3, arrangement: 'triple' },
        { type: 'row', seatCount: 3, arrangement: 'triple' },
        { type: 'row', seatCount: 3, arrangement: 'triple' },
        { type: 'row', seatCount: 3, arrangement: 'triple' },
        { type: 'row', seatCount: 3, arrangement: 'triple' },
        { type: 'row', seatCount: 3, arrangement: 'triple' }
      ]
    },
    vwCrafter: {
      name: 'Volkswagen Crafter',
      seats: 20,
      layout: [
        { type: 'driver', row: 0, cols: 1 },
        { type: 'door', row: 0, cols: 1 },
        { type: 'emergency_exit', row: 0 },
        { type: 'row', seatCount: 4, arrangement: 'quad' },
        { type: 'row', seatCount: 4, arrangement: 'quad' },
        { type: 'row', seatCount: 4, arrangement: 'quad' },
        { type: 'row', seatCount: 4, arrangement: 'quad' },
        { type: 'row', seatCount: 4, arrangement: 'quad' }
      ]
    },
    bigBus: {
      name: 'Büyük Servis',
      seats: 48,
      layout: [
        { type: 'driver', row: 0, cols: 1 },
        { type: 'door', row: 0, cols: 1 },
        { type: 'emergency_exit', row: 0 },
        { type: 'corridor', row: 0.5 },
        { type: 'row', seatCount: 4, arrangement: 'quad' },
        { type: 'row', seatCount: 4, arrangement: 'quad' },
        { type: 'row', seatCount: 4, arrangement: 'quad' },
        { type: 'row', seatCount: 4, arrangement: 'quad' },
        { type: 'row', seatCount: 4, arrangement: 'quad' },
        { type: 'row', seatCount: 4, arrangement: 'quad' },
        { type: 'row', seatCount: 4, arrangement: 'quad' },
        { type: 'row', seatCount: 4, arrangement: 'quad' }
      ]
    },
    minibus: {
      name: 'Midibüs',
      seats: 32,
      layout: [
        { type: 'driver', row: 0, cols: 1 },
        { type: 'door', row: 0, cols: 1 },
        { type: 'row', seatCount: 3, arrangement: 'triple' },
        { type: 'row', seatCount: 3, arrangement: 'triple' },
        { type: 'row', seatCount: 3, arrangement: 'triple' },
        { type: 'row', seatCount: 3, arrangement: 'triple' },
        { type: 'row', seatCount: 3, arrangement: 'triple' },
        { type: 'row', seatCount: 3, arrangement: 'triple' },
        { type: 'row', seatCount: 3, arrangement: 'triple' },
        { type: 'row', seatCount: 3, arrangement: 'triple' },
        { type: 'row', seatCount: 2, arrangement: 'pair' }
      ]
    },
    custom: {
      name: 'Özel Tasarım',
      seats: 0,
      layout: [
        { type: 'driver', row: 0, cols: 1 },
        { type: 'door', row: 0, cols: 1 }
      ]
    }
  },

  // ========== BAŞLATMA ==========
  init(serviceId) {
    this.state.serviceId = serviceId;
    this.loadServiceData();
    this.renderUI();
    this.attachEventListeners();
    console.log('✅ Servis Yerleşim Editörü başlatıldı:', serviceId);
  },

  // ========== VERİ YÖNETİMİ ==========
  async loadServiceData() {
    try {
      // Firestore'dan servis verisi çek
      if (!db) return console.error('Firestore bağlantısı yok');

      const docRef = doc(db, 'oy_servisler', this.state.serviceId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        this.state.serviceName = data.name || 'Servis';
        this.state.driverName = data.driver || '—';
        this.state.vehicleModel = data.vehicleModel || '—';
        this.state.vehicleType = data.vehicleType || 'fiatDucato';
        this.state.capacity = data.capacity || 16;

        // Yerleşim JSON'ı yükle
        if (data.seatingLayout) {
          this.state.currentData = JSON.parse(JSON.stringify(data.seatingLayout));
        } else {
          this.applyTemplate(this.state.vehicleType);
        }

        // Öğrenci listesini yükle
        await this.loadStudents();
        this.calculateStats();
      }
    } catch (err) {
      console.error('Veri yükleme hatası:', err);
    }
  },

  async loadStudents() {
    try {
      const snapshot = await getDocs(collection(db, 'oy_ogrenciler'));
      this.state.studentList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (err) {
      console.error('Öğrenci listesi yükleme hatası:', err);
    }
  },

  applyTemplate(templateType) {
    const template = this.vehicleTemplates[templateType];
    if (!template) return;

    this.state.vehicleType = templateType;
    this.state.capacity = template.seats;
    this.state.currentData.elements = [];
    this.state.currentData.rows = [];

    let seatNumber = 1;
    template.layout.forEach((item, idx) => {
      if (item.type === 'row') {
        const rowSeats = [];
        for (let i = 0; i < item.seatCount; i++) {
          rowSeats.push({
            id: `seat-${seatNumber}`,
            type: 'seat',
            seatNumber: seatNumber,
            studentId: null,
            status: 'empty',
            locked: false,
            x: i,
            y: idx
          });
          seatNumber++;
        }
        this.state.currentData.rows.push({
          id: `row-${idx}`,
          type: 'row',
          seats: rowSeats
        });
      }
    });

    this.state.history = [];
    this.state.historyIndex = -1;
    this.calculateStats();
  },

  calculateStats() {
    let total = 0, filled = 0;
    
    this.state.currentData.rows.forEach(row => {
      row.seats.forEach(seat => {
        total++;
        if (seat.studentId) filled++;
      });
    });

    this.state.totalSeats = total;
    this.state.filledSeats = filled;
  },

  // ========== RENDERELEME ==========
  renderUI() {
    this.renderInfoCard();
    this.renderVehicleSelector();
    this.renderToolbar();
    this.renderCanvas();
  },

  renderInfoCard() {
    const card = document.querySelector('.soe-info-card');
    if (!card) return;

    const percent = this.state.totalSeats > 0 
      ? Math.round((this.state.filledSeats / this.state.totalSeats) * 100)
      : 0;

    card.innerHTML = `
      <div class="soe-info-card-left">
        <h2>🚌 ${this.state.serviceName}</h2>
        <div class="soe-info-card-row">
          <span class="soe-info-card-label">Şoför</span>
          <span class="soe-info-card-value">${this.state.driverName}</span>
        </div>
        <div class="soe-info-card-row">
          <span class="soe-info-card-label">Araç</span>
          <span class="soe-info-card-value">${this.state.vehicleModel}</span>
        </div>
      </div>
      <div class="soe-info-card-right">
        <div class="soe-info-card-row">
          <span class="soe-info-card-label">Koltuk</span>
          <span class="soe-info-card-value">${this.state.filledSeats} / ${this.state.totalSeats}</span>
        </div>
        <div class="soe-info-card-row">
          <span class="soe-info-card-label">Doluluk</span>
          <span class="soe-info-card-value">%${percent}</span>
        </div>
        <div class="soe-capacity-bar">
          <div class="soe-capacity-fill" style="width: ${percent}%"></div>
        </div>
      </div>
    `;
  },

  renderVehicleSelector() {
    const selector = document.querySelector('.soe-vehicle-buttons');
    if (!selector) return;

    selector.innerHTML = Object.entries(this.vehicleTemplates)
      .map(([key, template]) => `
        <button class="soe-vehicle-btn ${this.state.vehicleType === key ? 'active' : ''}" 
          onclick="ServisYerlesimiEditor.selectTemplate('${key}')">
          ✅ ${template.name}
        </button>
      `).join('');
  },

  renderToolbar() {
    const toolbar = document.querySelector('.soe-toolbar');
    if (!toolbar || !this.state.editMode) return;

    toolbar.innerHTML = `
      <button class="soe-tool-btn" onclick="ServisYerlesimiEditor.addSeat()">➕ Koltuk Ekle</button>
      <button class="soe-tool-btn danger" onclick="ServisYerlesimiEditor.deleteSeat()">➖ Koltuk Sil</button>
      
      <div class="soe-toolbar-divider"></div>
      
      <button class="soe-tool-btn" onclick="ServisYerlesimiEditor.addSingleSeat()">🪑 Tekli</button>
      <button class="soe-tool-btn" onclick="ServisYerlesimiEditor.addPairSeats()">🪑🪑 İkili</button>
      <button class="soe-tool-btn" onclick="ServisYerlesimiEditor.addTripleSeats()">🪑🪑🪑 Üçlü</button>
      
      <div class="soe-toolbar-divider"></div>
      
      <button class="soe-tool-btn" onclick="ServisYerlesimiEditor.addDoor()">🚪 Kapı</button>
      <button class="soe-tool-btn" onclick="ServisYerlesimiEditor.addEmergencyExit()">🚨 Acil Çıkış</button>
      <button class="soe-tool-btn" onclick="ServisYerlesimiEditor.addCorridor()">➡️ Koridor</button>
      
      <div class="soe-toolbar-divider"></div>
      
      <button class="soe-tool-btn" onclick="ServisYerlesimiEditor.addRow()">↕ Satır Ekle</button>
      <button class="soe-tool-btn danger" onclick="ServisYerlesimiEditor.deleteRow()">🗑 Satır Sil</button>
      
      <div class="soe-toolbar-divider"></div>
      
      <button class="soe-tool-btn" onclick="ServisYerlesimiEditor.undo()">↩ Geri Al</button>
      <button class="soe-tool-btn" onclick="ServisYerlesimiEditor.redo()">↪ Yinele</button>
      
      <div class="soe-toolbar-divider"></div>
      
      <button class="soe-tool-btn success" onclick="ServisYerlesimiEditor.saveLayout()">💾 Kaydet</button>
    `;
  },

  renderCanvas() {
    const canvas = document.querySelector('.soe-canvas');
    if (!canvas) return;

    let html = '<div class="soe-vehicle-frame">';
    html += '<div class="soe-driver-area">' + (this.state.driverName !== '—' ? '👨‍✈️ Şoför' : '+ Şoför') + '</div>';

    this.state.currentData.rows.forEach((row, rowIdx) => {
      html += `<div class="soe-row ${this.state.editMode ? 'editing-mode' : ''}">
        <div class="soe-row-label">S${rowIdx + 1}</div>
        <div class="soe-seats-group">`;

      row.seats.forEach(seat => {
        const student = this.state.studentList.find(s => s.id === seat.studentId);
        const studentInitial = student ? student.name.charAt(0).toUpperCase() : '';
        
        html += `
          <div class="soe-seat ${seat.status} ${seat.id === this.state.selectedSeat ? 'selected' : ''}"
            id="seat-${seat.id}"
            draggable="true"
            onclick="ServisYerlesimiEditor.selectSeat('${seat.id}')"
            ondragstart="ServisYerlesimiEditor.dragStart(event, '${seat.id}')"
            ondragover="ServisYerlesimiEditor.dragOver(event)"
            ondrop="ServisYerlesimiEditor.drop(event, '${seat.id}')">
            <div class="soe-seat-number">${seat.seatNumber}</div>
            ${student ? `
              <div class="soe-seat-avatar">${studentInitial}</div>
              <div class="soe-seat-name">${student.name.split(' ')[0]}</div>
              <div class="soe-seat-class">${student.sınıf || '—'}</div>
            ` : '<span>+</span>'}
          </div>
        `;
      });

      html += '</div></div>';
    });

    html += '</div>';
    canvas.innerHTML = html;
  },

  // ========== KOLTUKİŞLEMLERİ ==========
  selectSeat(seatId) {
    this.state.selectedSeat = seatId;
    this.renderCanvas();
    this.openSeatDetailsBottomSheet(seatId);
  },

  selectTemplate(templateType) {
    this.applyTemplate(templateType);
    this.renderUI();
    this.saveHistory();
  },

  addSeat() {
    // Son satıra yeni koltuk ekle
    if (this.state.currentData.rows.length === 0) {
      this.addRow();
    }
    
    const lastRow = this.state.currentData.rows[this.state.currentData.rows.length - 1];
    const newSeatNum = Math.max(...lastRow.seats.map(s => s.seatNumber)) + 1;
    
    lastRow.seats.push({
      id: `seat-${Date.now()}`,
      type: 'seat',
      seatNumber: newSeatNum,
      studentId: null,
      status: 'empty',
      locked: false
    });

    this.calculateStats();
    this.renderCanvas();
    this.saveHistory();
  },

  deleteSeat() {
    if (!this.state.selectedSeat) return alert('Lütfen silinecek koltuk seçin');

    this.state.currentData.rows.forEach(row => {
      row.seats = row.seats.filter(s => s.id !== this.state.selectedSeat);
    });

    this.state.selectedSeat = null;
    this.calculateStats();
    this.renderCanvas();
    this.saveHistory();
  },

  addSingleSeat() {
    this.addRowWithSeats(1);
  },

  addPairSeats() {
    this.addRowWithSeats(2);
  },

  addTripleSeats() {
    this.addRowWithSeats(3);
  },

  addRowWithSeats(count) {
    this.addRow();
    const newRow = this.state.currentData.rows[this.state.currentData.rows.length - 1];
    const startNum = Math.max(...this.state.currentData.rows.flatMap(r => r.seats.map(s => s.seatNumber))) + 1;

    for (let i = 0; i < count - 1; i++) {
      newRow.seats.push({
        id: `seat-${Date.now()}-${i}`,
        type: 'seat',
        seatNumber: startNum + i,
        studentId: null,
        status: 'empty',
        locked: false
      });
    }

    this.calculateStats();
    this.renderCanvas();
    this.saveHistory();
  },

  addRow() {
    const rowNum = this.state.currentData.rows.length + 1;
    this.state.currentData.rows.push({
      id: `row-${Date.now()}`,
      type: 'row',
      seats: []
    });
  },

  deleteRow() {
    if (this.state.currentData.rows.length === 0) return;
    this.state.currentData.rows.pop();
    this.calculateStats();
    this.renderCanvas();
    this.saveHistory();
  },

  addDoor() {
    alert('🚪 Kapı şu an manuel konumlandırmada');
  },

  addEmergencyExit() {
    alert('🚨 Acil çıkış şu an manuel konumlandırmada');
  },

  addCorridor() {
    alert('➡️ Koridor şu an manuel konumlandırmada');
  },

  // ========== SÜRÜKLE-BIRAK ==========
  dragStart(event, seatId) {
    this.state.draggedElement = seatId;
    event.target.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
  },

  dragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  },

  drop(event, targetSeatId) {
    event.preventDefault();
    
    if (!this.state.draggedElement || this.state.draggedElement === targetSeatId) return;

    // Koltuklarin yerlerini degistir
    const findSeat = (id) => {
      for (let row of this.state.currentData.rows) {
        const seat = row.seats.find(s => s.id === id);
        if (seat) return seat;
      }
      return null;
    };

    const draggedSeat = findSeat(this.state.draggedElement);
    const targetSeat = findSeat(targetSeatId);

    if (draggedSeat && targetSeat) {
      [draggedSeat.studentId, targetSeat.studentId] = [targetSeat.studentId, draggedSeat.studentId];
      [draggedSeat.status, targetSeat.status] = [targetSeat.status, draggedSeat.status];
    }

    this.state.draggedElement = null;
    this.renderCanvas();
    this.saveHistory();
  },

  // ========== BOTTOM SHEET ==========
  openSeatDetailsBottomSheet(seatId) {
    const findSeat = (id) => {
      for (let row of this.state.currentData.rows) {
        const seat = row.seats.find(s => s.id === id);
        if (seat) return seat;
      }
      return null;
    };

    const seat = findSeat(seatId);
    if (!seat) return;

    const student = this.state.studentList.find(s => s.id === seat.studentId);

    const html = `
      <div class="soe-bottom-sheet">
        <div class="soe-bottom-sheet-header">
          <h3 class="soe-bottom-sheet-title">Koltuk #${seat.seatNumber}</h3>
          <button class="soe-bottom-sheet-close" onclick="this.closest('.soe-bottom-sheet').remove()">✕</button>
        </div>
        <div class="soe-bottom-sheet-content">
          <div class="soe-property-group">
            <label class="soe-property-label">Koltuk No</label>
            <div class="soe-property-value">#${seat.seatNumber}</div>
          </div>

          <div class="soe-property-group">
            <label class="soe-property-label">Öğrenci</label>
            <select class="soe-property-input" onchange="ServisYerlesimiEditor.assignStudent('${seatId}', this.value)">
              <option value="">-- Seçin --</option>
              ${this.state.studentList.map(s => `
                <option value="${s.id}" ${s.id === seat.studentId ? 'selected' : ''}>${s.name}</option>
              `).join('')}
            </select>
          </div>

          ${student ? `
            <div class="soe-property-group">
              <label class="soe-property-label">Sınıf</label>
              <div class="soe-property-value">${student.sınıf || '—'}</div>
            </div>

            <div class="soe-property-group">
              <label class="soe-property-label">Durak</label>
              <div class="soe-property-value">${student.durak || '—'}</div>
            </div>

            <div class="soe-property-group">
              <label class="soe-property-label">Veli</label>
              <div class="soe-property-value">${student.veliAdı || '—'}</div>
            </div>

            <div class="soe-property-group">
              <label class="soe-property-label">Telefon</label>
              <div class="soe-property-value">${student.telefon || '—'}</div>
            </div>

            <div class="soe-property-group">
              <label class="soe-property-label">Not</label>
              <textarea class="soe-property-input" placeholder="Özel not..." rows="2"></textarea>
            </div>
          ` : ''}

          <div class="soe-bottom-sheet-actions">
            <button class="btn btn-ghost" onclick="this.closest('.soe-bottom-sheet').remove()">Kapat</button>
            ${student ? `
              <button class="btn btn-amber" onclick="ServisYerlesimiEditor.removeStudent('${seatId}')">Öğrenciyi Kaldır</button>
            ` : ''}
          </div>
        </div>
      </div>
    `;

    // Overlay ekle
    const overlay = document.createElement('div');
    overlay.className = 'soe-overlay';
    overlay.onclick = (e) => {
      if (e.target === overlay) overlay.remove();
    };

    const sheet = document.createElement('div');
    sheet.innerHTML = html;

    document.body.appendChild(overlay);
    document.body.appendChild(sheet.firstElementChild);
  },

  assignStudent(seatId, studentId) {
    const findSeat = (id) => {
      for (let row of this.state.currentData.rows) {
        const seat = row.seats.find(s => s.id === id);
        if (seat) return seat;
      }
      return null;
    };

    const seat = findSeat(seatId);
    if (seat) {
      seat.studentId = studentId || null;
      seat.status = studentId ? 'filled' : 'empty';
      this.calculateStats();
      this.renderCanvas();
      this.renderInfoCard();
      this.saveHistory();
    }
  },

  removeStudent(seatId) {
    this.assignStudent(seatId, null);
  },

  // ========== TARIH YÖNETİMİ ==========
  saveHistory() {
    // Mevcut state'i history'ye ekle
    this.state.history = this.state.history.slice(0, this.state.historyIndex + 1);
    this.state.history.push(JSON.parse(JSON.stringify(this.state.currentData)));
    this.state.historyIndex++;

    // Son 50 işlem tut
    if (this.state.history.length > 50) {
      this.state.history.shift();
      this.state.historyIndex--;
    }
  },

  undo() {
    if (this.state.historyIndex > 0) {
      this.state.historyIndex--;
      this.state.currentData = JSON.parse(JSON.stringify(this.state.history[this.state.historyIndex]));
      this.calculateStats();
      this.renderCanvas();
    }
  },

  redo() {
    if (this.state.historyIndex < this.state.history.length - 1) {
      this.state.historyIndex++;
      this.state.currentData = JSON.parse(JSON.stringify(this.state.history[this.state.historyIndex]));
      this.calculateStats();
      this.renderCanvas();
    }
  },

  // ========== KAYDETME ==========
  async saveLayout() {
    try {
      if (!this.state.serviceId) return alert('Servis ID bulunamadı');

      const docRef = doc(db, 'oy_servisler', this.state.serviceId);
      await updateDoc(docRef, {
        seatingLayout: this.state.currentData,
        lastModified: new Date(),
        filledSeats: this.state.filledSeats,
        totalSeats: this.state.totalSeats
      });

      alert('✅ Yerleşim başarıyla kaydedildi!');
      console.log('Yerleşim kaydedildi:', this.state.currentData);
    } catch (err) {
      alert('❌ Kaydetme hatası: ' + err.message);
      console.error(err);
    }
  },

  // ========== EVENT LİSTENERS ==========
  attachEventListeners() {
    // Düzenleme modu toggle
    const editBtn = document.querySelector('[onclick*="toggleEditMode"]');
    if (editBtn) {
      editBtn.addEventListener('click', () => this.toggleEditMode());
    }

    // Yazdır butonu
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        this.saveLayout();
      }
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        this.undo();
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        this.redo();
      }
    });
  },

  toggleEditMode() {
    this.state.editMode = !this.state.editMode;
    const toolbar = document.querySelector('.soe-toolbar');
    if (toolbar) {
      toolbar.style.display = this.state.editMode ? 'flex' : 'none';
    }
    this.renderToolbar();
  }
};

// ============================================================================
// Sayfa yüklendikten sonra başlat
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  // Firestore kontrolü
  if (typeof db === 'undefined') {
    console.error('Firebase başlatılmamış');
    return;
  }

  // URL veya veri özniteliğinden serviceId al
  const serviceId = new URLSearchParams(window.location.search).get('serviceId') 
    || document.querySelector('.soe-container')?.dataset.serviceId;

  if (serviceId) {
    ServisYerlesimiEditor.init(serviceId);
  }
});
