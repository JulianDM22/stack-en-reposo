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

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { calcular: calcular, validar: validar, DEFAULTS: DEFAULTS };
  }
  if (typeof document === 'undefined') { return; }

  /* ---------------- interfaz ---------------- */
  var $ = function (id) { return document.getElementById(id); };
  var fmt = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });
  var fmt1 = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  function construirFilas() {
    var tbody = $('env-rows');
    tbody.innerHTML = '';
    DEFAULTS.ambientes.forEach(function (a, i) {
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<th scope="row"><span class="env-badge env-' + a.nombre.toLowerCase() + '">' + a.nombre + '</span></th>' +
        '<td><input type="number" min="0" step="1" inputmode="numeric" id="n' + i + '" aria-label="Instancias de ' + a.nombre + '"></td>' +
        '<td><input type="number" min="0" max="24" step="1" inputmode="numeric" id="h' + i + '" aria-label="Horas por día de ' + a.nombre + '"></td>' +
        '<td><input type="number" min="0" max="31" step="1" inputmode="numeric" id="d' + i + '" aria-label="Días por mes de ' + a.nombre + '"></td>';
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

  function limpiar(msg) {
    ['k-actual', 'k-propuesto', 'k-abs', 'k-pct', 'goal-text'].forEach(function (id) { $(id).textContent = '–'; });
    $('bar-before').style.width = '0';
    $('bar-after').style.width = '0';
    $('progress').style.width = '0';
    $('verdict').textContent = msg;
    $('verdict').className = 'verdict';
    $('detail-rows').innerHTML = '';
    $('day').innerHTML = '';
  }

  function actualizar() {
    var d = leer();
    var errores = validar(d);
    var box = $('errores');
    if (errores.length) {
      box.hidden = false;
      box.innerHTML = errores.map(function (x) { return '<span>' + x + '</span>'; }).join('');
      limpiar('Corrige los datos marcados para ver el resultado.');
      return;
    }
    box.hidden = true;
    var r = calcular(d);
    if (r.actual === 0) {
      limpiar('No hay horas-instancia actuales que reducir: ingresa al menos una instancia encendida.');
      return;
    }
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
      v.textContent = 'El escenario propuesto consume más horas-instancia que el actual: revisa las excepciones o el horario.';
      v.className = 'verdict bad';
    } else if (r.cumpleMeta) {
      v.textContent = 'Se alcanzaría la meta propuesta del ' + d.meta + ' % de reducción.';
      v.className = 'verdict ok';
    } else {
      v.textContent = 'No se alcanzaría la meta propuesta del ' + d.meta + ' %: faltan ' + fmt1.format(d.meta - r.pct) + ' puntos porcentuales.';
      v.className = 'verdict bad';
    }

    var tb = $('detail-rows');
    tb.innerHTML = r.filas.map(function (f) {
      return '<tr><th scope="row">' + f.nombre + '</th><td>' + fmt.format(f.actual) + '</td><td>' + fmt.format(f.propuesto) + '</td><td>' + fmt.format(f.reduccion) + '</td></tr>';
    }).join('') +
      '<tr class="exc"><th scope="row">Excepciones</th><td>–</td><td>+' + fmt.format(d.excepciones) + '</td><td>−' + fmt.format(d.excepciones) + '</td></tr>' +
      '<tr class="tot"><th scope="row">Total</th><td>' + fmt.format(r.actual) + '</td><td>' + fmt.format(r.propuesto) + '</td><td>' + fmt.format(r.reduccion) + '</td></tr>';
    pintarDia(d);
  }

  construirFilas();
  cargar(DEFAULTS);
  $('form').addEventListener('input', actualizar);
  $('form').addEventListener('submit', function (ev) { ev.preventDefault(); });
  $('reset').addEventListener('click', function () { cargar(DEFAULTS); actualizar(); });
  actualizar();
})(this);
