/* Stack en Reposo - simulador de horas-instancia (prototipo académico, sin dependencias). */
(function (root) {
  'use strict';

  var DEFAULTS = {
    ambientes: [
      { nombre: 'DEV', instancias: 4, horasDia: 24, diasMes: 30 },
      { nombre: 'TEST', instancias: 3, horasDia: 24, diasMes: 30 },
      { nombre: 'STAGING', instancias: 3, horasDia: 24, diasMes: 30 }
    ],
    inicio: 7,
    fin: 19,
    diasLaborales: 22,
    excepciones: 40,
    meta: 45
  };

  /* Ejemplos listos (valores supuestos, no datos reales). */
  function copia(o) { return JSON.parse(JSON.stringify(o)); }
  var PRESETS = {
    neiva: { datos: copia(DEFAULTS), nota: 'Caso Software Neiva S.A.S.: 10 computadores de prueba siempre encendidos y una jornada de 7:00 a 19:00.' },
    pequena: {
      datos: { ambientes: [
        { nombre: 'DEV', instancias: 2, horasDia: 24, diasMes: 30 },
        { nombre: 'TEST', instancias: 1, horasDia: 24, diasMes: 30 },
        { nombre: 'STAGING', instancias: 1, horasDia: 24, diasMes: 30 }
      ], inicio: 7, fin: 19, diasLaborales: 22, excepciones: 10, meta: 45 },
      nota: 'Empresa pequeña: solo 4 computadores de prueba. El porcentaje de ahorro es parecido; lo que cambia es el tamaño.'
    },
    corta: {
      datos: (function () { var d = copia(DEFAULTS); d.inicio = 8; d.fin = 18; return d; })(),
      nota: 'Jornada corta: los computadores solo se encienden de 8:00 a 18:00. Menos horas encendidos, más ahorro.'
    },
    urgencias: {
      datos: (function () { var d = copia(DEFAULTS); d.excepciones = 1500; return d; })(),
      nota: 'Muchas urgencias nocturnas: si el equipo enciende todo fuera de horario con frecuencia, el ahorro cae y la meta no se cumple. Por eso cada excepción debe quedar registrada y revisarse.'
    }
  };

  /* Cálculo puro: no toca el DOM (se prueba aparte con Node). */
  function calcular(d) {
    var horasProgramadas = d.fin - d.inicio;
    var filas = d.ambientes.map(function (a) {
      var actual = a.instancias * a.horasDia * a.diasMes;
      var propuesto = a.instancias * Math.min(a.horasDia, horasProgramadas) * Math.min(a.diasMes, d.diasLaborales);
      return { nombre: a.nombre, actual: actual, propuesto: propuesto, reduccion: actual - propuesto };
    });
    var actual = filas.reduce(function (s, f) { return s + f.actual; }, 0);
    var propuesto = filas.reduce(function (s, f) { return s + f.propuesto; }, 0) + d.excepciones;
    var reduccion = actual - propuesto;
    var pct = actual > 0 ? (reduccion / actual) * 100 : 0;
    return {
      filas: filas,
      horasProgramadas: horasProgramadas,
      actual: actual,
      propuesto: propuesto,
      reduccion: reduccion,
      pct: pct,
      cumpleMeta: actual > 0 && pct >= d.meta
    };
  }

  function validar(d) {
    var e = [];
    function entero(v) { return typeof v === 'number' && isFinite(v) && Math.floor(v) === v; }
    d.ambientes.forEach(function (a) {
      if (!entero(a.instancias) || a.instancias < 0 || a.instancias > 10000) e.push(a.nombre + ': instancias debe ser un entero entre 0 y 10000.');
      if (!entero(a.horasDia) || a.horasDia < 0 || a.horasDia > 24) e.push(a.nombre + ': horas por día debe estar entre 0 y 24.');
      if (!entero(a.diasMes) || a.diasMes < 0 || a.diasMes > 31) e.push(a.nombre + ': días por mes debe estar entre 0 y 31.');
    });
    if (!entero(d.inicio) || d.inicio < 0 || d.inicio > 23) e.push('La hora de encendido debe estar entre 0 y 23.');
    if (!entero(d.fin) || d.fin < 1 || d.fin > 24) e.push('La hora de apagado debe estar entre 1 y 24.');
    if (entero(d.inicio) && entero(d.fin) && d.fin <= d.inicio) e.push('La hora de apagado debe ser posterior a la de encendido (este prototipo no maneja horarios que crucen la medianoche).');
    if (!entero(d.diasLaborales) || d.diasLaborales < 0 || d.diasLaborales > 31) e.push('Los días laborales deben estar entre 0 y 31.');
    if (!entero(d.excepciones) || d.excepciones < 0) e.push('Las excepciones deben ser un entero mayor o igual a 0.');
    if (!entero(d.meta) || d.meta < 1 || d.meta > 100) e.push('La meta debe estar entre 1 y 100 %.');
    return e;
  }

  /* Estado de un computador a una hora dada (para el recorrido del día).
     Hoy: se supone que sus horas diarias empiezan con la jornada; 24 h = siempre encendido.
     Con el horario: encendido solo entre entrada y salida, y solo en días de trabajo. */
  function encendidoHoy(a, d, hora, laboral) {
    if (a.instancias === 0 || a.horasDia === 0 || a.diasMes === 0) return false;
    if (!laboral && a.diasMes <= d.diasLaborales) return false;
    return ((hora - d.inicio + 24) % 24) < a.horasDia;
  }
  function encendidoPropuesto(a, d, hora, laboral) {
    if (!laboral || a.instancias === 0 || a.horasDia === 0 || a.diasMes === 0) return false;
    return hora >= d.inicio && hora < d.fin && (hora - d.inicio) < a.horasDia;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { calcular: calcular, validar: validar, DEFAULTS: DEFAULTS, PRESETS: PRESETS, encendidoHoy: encendidoHoy, encendidoPropuesto: encendidoPropuesto };
  }
  if (typeof document === 'undefined') { return; }

  /* ---------------- interfaz ---------------- */
  var $ = function (id) { return document.getElementById(id); };
  var fmt = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });
  var fmt1 = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  var NOMBRES = { DEV: 'construir', TEST: 'probar', STAGING: 'ensayo final' };
  var MAX_ICONOS = 40;
  var diaLaboral = true;
  var ultimo = null;

  function hh(h) { return (h === 24 ? '24' : String(h)) + ':00'; }

  function construirFilas() {
    var tbody = $('env-rows');
    tbody.innerHTML = '';
    DEFAULTS.ambientes.forEach(function (a, i) {
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<th scope="row"><span class="env-badge env-' + a.nombre.toLowerCase() + '">' + a.nombre + '</span><span class="env-sub">' + NOMBRES[a.nombre] + '</span></th>' +
        '<td><input type="number" min="0" step="1" inputmode="numeric" id="n' + i + '" aria-label="Computadores de ' + a.nombre + '"></td>' +
        '<td><input type="number" min="0" max="24" step="1" inputmode="numeric" id="h' + i + '" aria-label="Horas al día de ' + a.nombre + '"></td>' +
        '<td><input type="number" min="0" max="31" step="1" inputmode="numeric" id="d' + i + '" aria-label="Días al mes de ' + a.nombre + '"></td>';
      tbody.appendChild(tr);
    });
  }

  function cargar(v) {
    v.ambientes.forEach(function (a, i) {
      $('n' + i).value = a.instancias;
      $('h' + i).value = a.horasDia;
      $('d' + i).value = a.diasMes;
    });
    $('inicio').value = v.inicio;
    $('fin').value = v.fin;
    $('dias').value = v.diasLaborales;
    $('excepciones').value = v.excepciones;
    $('meta').value = v.meta;
  }

  function leer() {
    function num(id) { var s = $(id).value.trim(); return s === '' ? NaN : Number(s); }
    return {
      ambientes: DEFAULTS.ambientes.map(function (a, i) {
        return { nombre: a.nombre, instancias: num('n' + i), horasDia: num('h' + i), diasMes: num('d' + i) };
      }),
      inicio: num('inicio'),
      fin: num('fin'),
      diasLaborales: num('dias'),
      excepciones: num('excepciones'),
      meta: num('meta')
    };
  }

  /* Resumen en lenguaje sencillo. "Computadores apagados el mes completo" es una equivalencia de
     tiempo (1 mes = 30 días × 24 h = 720 h), no de energía. */
  function resumen(r, d) {
    var total = d.ambientes.reduce(function (s, a) { return s + a.instancias; }, 0);
    var t = '<p>Hoy, los <strong>' + fmt.format(total) + ' computadores</strong> de prueba suman <strong>' + fmt.format(r.actual) + ' horas encendidos</strong> al mes.</p>';
    t += '<p>Si se encienden solo de <strong>' + hh(d.inicio) + ' a ' + hh(d.fin) + '</strong> los <strong>' + d.diasLaborales + ' días de trabajo</strong>' +
      (d.excepciones > 0 ? ', más ' + fmt.format(d.excepciones) + ' horas por urgencias,' : '') +
      ' sumarían <strong>' + fmt.format(r.propuesto) + '</strong>.</p>';
    if (r.reduccion > 0) {
      var eq = r.reduccion / 720;
      t += '<p class="big">Se dejarían de usar <strong>' + fmt.format(r.reduccion) + ' horas al mes</strong>: es como si <strong>' +
        (eq >= 1 ? fmt1.format(eq).replace(',0', '') + ' computadores' : 'una parte de un computador') +
        '</strong> pasaran el mes entero apagados.</p>';
    } else if (r.reduccion < 0) {
      t += '<p class="big warn">Con estos datos, el horario propuesto usaría <strong>más</strong> horas que hoy. Revise las urgencias o el horario.</p>';
    } else {
      t += '<p class="big">Con estos datos no habría ahorro: los computadores ya están encendidos solo en horario de trabajo.</p>';
    }
    return t;
  }

  function pintarDia(d) {
    var cont = $('day');
    cont.innerHTML = '';
    d.ambientes.forEach(function (a) {
      var row = document.createElement('div');
      row.className = 'day-row';
      var label = document.createElement('span');
      label.className = 'day-label';
      label.textContent = a.nombre;
      row.appendChild(label);
      var strip = document.createElement('div');
      strip.className = 'strip';
      for (var h = 0; h < 24; h++) {
        var c = document.createElement('i');
        c.className = (h >= d.inicio && h < d.fin) ? 'on' : 'off';
        c.title = h + ':00';
        strip.appendChild(c);
      }
      row.appendChild(strip);
      cont.appendChild(row);
    });
    var axis = document.createElement('div');
    axis.className = 'day-axis';
    axis.innerHTML = '<span></span><div><b>0 h</b><b>6 h</b><b>12 h</b><b>18 h</b><b>24 h</b></div>';
    cont.appendChild(axis);
  }

  /* Recorrido del día: un cuadrito por computador (hasta MAX_ICONOS). */
  function pintarFlota() {
    var d = ultimo;
    var hora = Number($('hora').value);
    $('hora-l').textContent = hh(hora);
    var noche = hora < 6 || hora >= 19;
    $('sky').className = 'sky ' + (noche ? 'night' : 'day');
    if (!d) { $('f-hoy').innerHTML = ''; $('f-prop').innerHTML = ''; $('c-hoy').textContent = ''; $('c-prop').textContent = ''; $('walk-msg').textContent = ''; return; }
    var total = 0, onHoy = 0, onProp = 0, hoyHTML = '', propHTML = '', dibujados = 0;
    d.ambientes.forEach(function (a) {
      var h = encendidoHoy(a, d, hora, diaLaboral), p = encendidoPropuesto(a, d, hora, diaLaboral);
      total += a.instancias;
      if (h) onHoy += a.instancias;
      if (p) onProp += a.instancias;
      var cls = 'env-' + a.nombre.toLowerCase();
      for (var i = 0; i < a.instancias && dibujados < MAX_ICONOS; i++, dibujados++) {
        hoyHTML += '<i class="srv ' + cls + (h ? ' on' : '') + '" title="' + a.nombre + '"></i>';
        propHTML += '<i class="srv ' + cls + (p ? ' on' : '') + '" title="' + a.nombre + '"></i>';
      }
    });
    if (total > MAX_ICONOS) {
      hoyHTML += '<span class="more-n">+' + fmt.format(total - MAX_ICONOS) + '</span>';
      propHTML += '<span class="more-n">+' + fmt.format(total - MAX_ICONOS) + '</span>';
    }
    $('f-hoy').innerHTML = hoyHTML;
    $('f-prop').innerHTML = propHTML;
    $('c-hoy').textContent = fmt.format(onHoy) + ' de ' + fmt.format(total) + ' encendidos';
    $('c-prop').textContent = fmt.format(onProp) + ' de ' + fmt.format(total) + ' encendidos';
    var msg;
    if (!diaLaboral) msg = 'Fin de semana o festivo: nadie trabaja. Con el horario propuesto todo descansa; hoy siguen encendidos si nadie los apaga.';
    else if (onProp > 0) msg = 'Horario de trabajo (' + hh(d.inicio) + ' a ' + hh(d.fin) + '): el equipo los está usando, así que siguen encendidos.';
    else if (onHoy > 0) msg = 'Fuera de horario: la oficina está vacía. Con Stack en Reposo estos ' + fmt.format(onHoy) + ' computadores descansan. Si surge una urgencia, se encienden como excepción registrada.';
    else msg = 'A esta hora no hay computadores de prueba encendidos.';
    $('walk-msg').textContent = msg + ' Producción, la que usan los clientes, sigue siempre encendida.';
  }

  function limpiar(msg) {
    ['k-actual', 'k-propuesto', 'k-abs', 'k-pct', 'goal-text'].forEach(function (id) { $(id).textContent = '–'; });
    $('bar-before').style.width = '0';
    $('bar-after').style.width = '0';
    $('bar-before').textContent = '';
    $('bar-after').textContent = '';
    $('progress').style.width = '0';
    $('verdict').textContent = msg;
    $('verdict').className = 'verdict';
    $('plain').innerHTML = '<p>' + msg + '</p>';
    $('detail-rows').innerHTML = '';
    $('day').innerHTML = '';
    ultimo = null;
    pintarFlota();
  }

  function actualizar() {
    var d = leer();
    var errores = validar(d);
    var box = $('errores');
    if (errores.length) {
      box.hidden = false;
      box.innerHTML = errores.map(function (x) { return '<span>' + x + '</span>'; }).join('');
      limpiar('Corrija los datos marcados para ver el resultado.');
      return;
    }
    box.hidden = true;
    var r = calcular(d);
    if (r.actual === 0) {
      limpiar('No hay horas-instancia que reducir: escriba al menos un computador encendido.');
      return;
    }
    ultimo = d;
    $('plain').innerHTML = resumen(r, d);
    $('k-actual').textContent = fmt.format(r.actual);
    $('k-propuesto').textContent = fmt.format(r.propuesto);
    $('k-abs').textContent = fmt.format(r.reduccion);
    $('k-pct').textContent = fmt1.format(r.pct) + ' %';

    var max = Math.max(r.actual, r.propuesto);
    $('bar-before').style.width = (r.actual / max * 100) + '%';
    $('bar-after').style.width = (r.propuesto / max * 100) + '%';
    $('bar-before').textContent = fmt.format(r.actual) + ' h-i';
    $('bar-after').textContent = fmt.format(r.propuesto) + ' h-i';

    var avance = Math.max(0, Math.min(100, r.pct));
    $('progress').style.width = avance + '%';
    $('goal-mark').style.left = d.meta + '%';
    $('goal-text').textContent = fmt1.format(r.pct) + ' % de ' + d.meta + ' %';
    var v = $('verdict');
    if (r.reduccion < 0) {
      v.textContent = 'El horario propuesto usaría más horas-instancia que hoy: revise las urgencias o el horario.';
      v.className = 'verdict bad';
    } else if (r.cumpleMeta) {
      v.textContent = 'Sí. Se alcanzaría la meta propuesta de ' + d.meta + ' % menos horas-instancia.';
      v.className = 'verdict ok';
    } else {
      v.textContent = 'No. Faltarían ' + fmt1.format(d.meta - r.pct) + ' puntos para llegar a la meta del ' + d.meta + ' %.';
      v.className = 'verdict bad';
    }

    var tb = $('detail-rows');
    tb.innerHTML = r.filas.map(function (f) {
      return '<tr><th scope="row">' + f.nombre + '</th><td>' + fmt.format(f.actual) + '</td><td>' + fmt.format(f.propuesto) + '</td><td>' + fmt.format(f.reduccion) + '</td></tr>';
    }).join('') +
      '<tr class="exc"><th scope="row">Urgencias</th><td>–</td><td>+' + fmt.format(d.excepciones) + '</td><td>−' + fmt.format(d.excepciones) + '</td></tr>' +
      '<tr class="tot"><th scope="row">Total</th><td>' + fmt.format(r.actual) + '</td><td>' + fmt.format(r.propuesto) + '</td><td>' + fmt.format(r.reduccion) + '</td></tr>';
    pintarDia(d);
    pintarFlota();
  }

  function marcarPreset(id) {
    document.querySelectorAll('.chip').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-preset') === id); });
    $('preset-note').textContent = id ? PRESETS[id].nota : 'Datos personalizados.';
  }

  /* Ilustración de la cabecera: el mismo cuarto de servidores de día y de noche. */
  function pintarArte() {
    function rack(x, encendidos, dia) {
      var s = '';
      for (var c = 0; c < 2; c++) {
        var cx = x + c * 100;
        s += '<rect x="' + cx + '" y="70" width="88" height="186" rx="6" fill="' + (dia ? '#14211c' : '#0a120f') + '"/>';
        for (var r = 0; r < 5; r++) {
          var y = 82 + r * 34, on = encendidos;
          s += '<rect x="' + (cx + 8) + '" y="' + y + '" width="72" height="26" rx="3" fill="' + (dia ? '#2a3a33' : '#17231e') + '"/>';
          s += '<circle cx="' + (cx + 18) + '" cy="' + (y + 13) + '" r="3.4" fill="' + (on ? '#9fe0b8' : '#3d4a44') + '"/>';
          s += '<rect x="' + (cx + 28) + '" y="' + (y + 10) + '" width="44" height="6" rx="2" fill="' + (dia ? '#3e5148' : '#22302a') + '"/>';
        }
      }
      return s;
    }
    var d = document.getElementById('rack-day'), n = document.getElementById('rack-night');
    if (d) d.innerHTML = rack(30, true, true);
    if (n) n.innerHTML = rack(295, true, false);
  }

  construirFilas();
  cargar(DEFAULTS);
  pintarArte();
  marcarPreset('neiva');
  $('form').addEventListener('input', function () { marcarPreset(null); actualizar(); });
  $('form').addEventListener('submit', function (ev) { ev.preventDefault(); });
  $('reset').addEventListener('click', function () { cargar(DEFAULTS); marcarPreset('neiva'); actualizar(); });
  document.querySelectorAll('.chip').forEach(function (b) {
    b.addEventListener('click', function () {
      var id = b.getAttribute('data-preset');
      cargar(copia(PRESETS[id].datos));
      marcarPreset(id);
      actualizar();
    });
  });
  document.querySelectorAll('.seg-b').forEach(function (b) {
    b.addEventListener('click', function () {
      diaLaboral = b.getAttribute('data-dia') === 'laboral';
      document.querySelectorAll('.seg-b').forEach(function (x) { x.classList.toggle('on', x === b); });
      pintarFlota();
    });
  });
  $('hora').addEventListener('input', pintarFlota);
  actualizar();
})(this);
