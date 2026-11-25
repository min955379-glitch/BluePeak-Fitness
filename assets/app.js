/*
 * BluePeak Fitness — landing page behaviour
 * Plain ES2017 browser script, no dependencies. Loaded with `defer`.
 */
(function () {
  'use strict';

  /* ------------------------------------------------------------------
   * Configuration — edit these values, nothing else needs to change.
   * ------------------------------------------------------------------ */
  var CONFIG = {
    // IANA time zone of the club, used for the live "open / closed" badge.
    clubTimeZone: 'America/New_York',
    opensHour: 5,   // 05:00
    closesHour: 23, // 23:00
    // HTTPS endpoint that accepts a JSON POST of each lead. Leave empty
    // until a backend is connected; the form then shows the phone fallback.
    leadEndpoint: '',
    leadTimeoutMs: 15000
  };

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };

  /* ------------------------------------------------------------------
   * 1. Live club status (top bar)
   * ------------------------------------------------------------------ */
  function clubHourNow() {
    var parts = new Intl.DateTimeFormat('en-US', {
      timeZone: CONFIG.clubTimeZone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    }).formatToParts(new Date());
    var get = function (type) {
      var p = parts.filter(function (x) { return x.type === type; })[0];
      return p ? parseInt(p.value, 10) % 24 : 0;
    };
    return get('hour') + get('minute') / 60;
  }

  function updateClubStatus() {
    var badge = $('#liveStatusBadge');
    var text = $('#liveStatusText');
    if (!badge || !text) return;

    var isOpen;
    try {
      var now = clubHourNow();
      isOpen = now >= CONFIG.opensHour && now < CONFIG.closesHour;
    } catch (err) {
      // Intl time-zone support missing: fall back to not claiming "open".
      isOpen = false;
    }

    text.textContent = isOpen
      ? 'CLUB OPEN · ' + pad(CONFIG.opensHour) + ':00 – ' + pad(CONFIG.closesHour) + ':00'
      : 'CLUB CLOSED · OPENS ' + pad(CONFIG.opensHour) + ':00';

    badge.classList.toggle('text-cyan-400', isOpen);
    badge.classList.toggle('text-slate-400', !isOpen);
    $$('.animate-ping', badge).forEach(function (el) { el.classList.toggle('hidden', !isOpen); });
    $$('span.bg-cyan-500', badge).forEach(function (el) {
      el.classList.toggle('bg-cyan-500', isOpen);
      el.classList.toggle('bg-slate-500', !isOpen);
    });
  }

  /* ------------------------------------------------------------------
   * 2. Mobile navigation drawer
   * ------------------------------------------------------------------ */
  function initDrawer() {
    var btn = $('#mobileDrawerBtn');
    var drawer = $('#mobileDrawer');
    if (!btn || !drawer) return;

    var iconOpen = $('#iconMenuOpen');
    var iconClose = $('#iconMenuClose');

    function setDrawer(open) {
      drawer.classList.toggle('hidden', !open);
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
      iconOpen.classList.toggle('hidden', open);
      iconClose.classList.toggle('hidden', !open);
    }

    btn.addEventListener('click', function () {
      setDrawer(drawer.classList.contains('hidden'));
    });

    $$('a', drawer).forEach(function (link) {
      link.addEventListener('click', function () { setDrawer(false); });
    });

    // The drawer's "Claim pass" button opens the modal, so close the drawer too.
    drawer.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('[data-open-booking]')) setDrawer(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !drawer.classList.contains('hidden')) {
        setDrawer(false);
        btn.focus();
      }
    });

    // Desktop layout has its own nav; make sure the drawer state never sticks.
    window.matchMedia('(min-width: 1024px)').addEventListener('change', function (mq) {
      if (mq.matches) setDrawer(false);
    });
  }

  /* ------------------------------------------------------------------
   * 3. Booking / lead-capture modal
   * ------------------------------------------------------------------ */
  var modal, lastTrigger;

  function modalFocusable() {
    return $$('button:not([disabled]), [href], input:not([disabled]):not([tabindex="-1"]), select:not([disabled]), textarea:not([disabled])', modal)
      .filter(function (el) { return el.offsetParent !== null; });
  }

  function setFormVisible(showForm) {
    $('#bookingFormWrap').classList.toggle('hidden', !showForm);
    $('#bookingSuccess').classList.toggle('hidden', showForm);
  }

  function clearErrors() {
    $$('#bookingForm [aria-invalid]').forEach(function (el) { el.removeAttribute('aria-invalid'); });
    $$('#bookingForm p[id^="err-"]').forEach(function (p) { p.textContent = ''; p.classList.add('hidden'); });
    showStatus('', '');
  }

  function showStatus(message, tone) {
    var box = $('#bookingStatus');
    box.textContent = message;
    box.classList.remove('hidden', 'bg-red-500/10', 'text-red-300', 'border', 'border-red-500/30', 'bg-cyan-500/10', 'text-cyan-300', 'border-cyan-500/30');
    if (!message) {
      box.classList.add('hidden');
      return;
    }
    if (tone === 'error') {
      box.classList.add('bg-red-500/10', 'text-red-300', 'border', 'border-red-500/30');
    } else {
      box.classList.add('bg-cyan-500/10', 'text-cyan-300', 'border', 'border-cyan-500/30');
    }
  }

  function openBookingModal(opts) {
    opts = opts || {};
    modal = modal || $('#bookingModal');
    lastTrigger = document.activeElement;

    $('#bookingTitle').textContent = opts.title || 'Claim Your Free Pass';
    $('#bookingSubtitle').textContent = opts.subtitle || '';

    $('#bookingForm').reset();
    clearErrors();
    setFormVisible(true);
    $('#bookingSubmit').disabled = false;

    modal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
    setTimeout(function () { $('#fullName').focus(); }, 0);
  }

  function closeBookingModal() {
    if (!modal || modal.classList.contains('hidden')) return;
    modal.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
    if (lastTrigger && typeof lastTrigger.focus === 'function') lastTrigger.focus();
  }

  // Public hook used by any inline/legacy caller.
  window.openBookingModal = openBookingModal;
  window.closeBookingModal = closeBookingModal;

  var VALIDATORS = {
    fullName: function (v) {
      return v.trim().length >= 2 ? '' : 'Please enter your full name.';
    },
    email: function (v) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Enter a valid email address.';
    },
    phone: function (v) {
      var digits = v.replace(/\D/g, '');
      var ok = /^\+?[\d\s().-]+$/.test(v.trim()) && digits.length >= 7 && digits.length <= 15;
      return ok ? '' : 'Enter a valid phone number.';
    },
    leadGoal: function (v) {
      return v ? '' : 'Choose your main goal.';
    },
    consent: function (_v, el) {
      return el.checked ? '' : 'Please tick the box so we can contact you.';
    }
  };

  function validateField(id) {
    var el = document.getElementById(id);
    var errEl = document.getElementById('err-' + id);
    var msg = VALIDATORS[id](el.type === 'checkbox' ? '' : el.value, el);
    el.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (errEl) {
      errEl.textContent = msg;
      errEl.classList.toggle('hidden', !msg);
    }
    return !msg;
  }

  function validateBookingForm() {
    var ids = ['fullName', 'email', 'phone', 'leadGoal', 'consent'];
    var firstInvalid = null;
    ids.forEach(function (id) {
      var ok = validateField(id);
      if (!ok && !firstInvalid) firstInvalid = document.getElementById(id);
    });
    if (firstInvalid) firstInvalid.focus();
    return !firstInvalid;
  }

  function collectLead(form) {
    var data = new FormData(form);
    return {
      name: String(data.get('fullName') || '').trim(),
      email: String(data.get('email') || '').trim(),
      phone: String(data.get('phone') || '').trim(),
      goal: String(data.get('goal') || ''),
      preferredTime: String(data.get('visitTime') || ''),
      offer: $('#bookingTitle').textContent,
      submittedAt: new Date().toISOString(),
      source: window.location.pathname
    };
  }

  function submitLead(lead) {
    if (!CONFIG.leadEndpoint) {
      return Promise.reject(new Error('NOT_CONFIGURED'));
    }
    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, CONFIG.leadTimeoutMs) : null;
    return fetch(CONFIG.leadEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(lead),
      signal: controller ? controller.signal : undefined
    }).then(function (res) {
      if (timer) clearTimeout(timer);
      if (!res.ok) throw new Error('HTTP_' + res.status);
      return res;
    }, function (err) {
      if (timer) clearTimeout(timer);
      throw err;
    });
  }

  function initBookingForm() {
    var form = $('#bookingForm');
    if (!form) return;

    // Live re-validation once a field has been touched.
    ['fullName', 'email', 'phone', 'leadGoal', 'consent'].forEach(function (id) {
      var el = document.getElementById(id);
      el.addEventListener(el.type === 'checkbox' ? 'change' : 'blur', function () { validateField(id); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      showStatus('', '');

      // Honeypot tripped: pretend success without sending anything.
      if ($('#website').value) {
        setFormVisible(false);
        return;
      }

      if (!validateBookingForm()) return;

      var submit = $('#bookingSubmit');
      var lead = collectLead(form);
      submit.disabled = true;
      submit.textContent = 'Sending…';

      submitLead(lead)
        .then(function () {
          form.reset();
          setFormVisible(false);
        })
        .catch(function (err) {
          if (err && err.message === 'NOT_CONFIGURED') {
            showStatus('Online sign-up is not connected yet. Please call +1 (555) 239-8840 and the front desk will set up your pass.', 'error');
          } else {
            showStatus('We could not send your request. Please try again, or call +1 (555) 239-8840.', 'error');
          }
        })
        .then(function () {
          submit.disabled = false;
          submit.textContent = 'Request My Pass';
        });
    });
  }

  function initModal() {
    modal = $('#bookingModal');
    if (!modal) return;

    // Open buttons anywhere on the page (delegated, so no inline handlers needed).
    document.addEventListener('click', function (e) {
      var trigger = e.target.closest && e.target.closest('[data-open-booking]');
      if (!trigger) return;
      e.preventDefault();
      openBookingModal({ title: trigger.getAttribute('data-title'), subtitle: trigger.getAttribute('data-subtitle') });
    });

    // Close buttons and backdrop.
    $$('[data-modal-close]', modal).forEach(function (el) {
      el.addEventListener('click', closeBookingModal);
    });

    document.addEventListener('keydown', function (e) {
      if (modal.classList.contains('hidden')) return;
      if (e.key === 'Escape') {
        closeBookingModal();
        return;
      }
      // Keep keyboard focus inside the dialog while it is open.
      if (e.key === 'Tab') {
        var items = modalFocusable();
        if (!items.length) return;
        var first = items[0];
        var last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });

    initBookingForm();
  }

  /* ------------------------------------------------------------------
   * 4. TDEE & macro calculator (Mifflin-St Jeor)
   * ------------------------------------------------------------------ */
  var CALC_LIMITS = {
    age: [15, 100],
    cm: [120, 230],
    kg: [35, 250],
    ft: [4, 7],
    inch: [0, 11.5],
    lb: [80, 550]
  };

  function readNumber(form, name) {
    var el = form.elements[name];
    if (!el) return NaN;
    var raw = String(el.value || '').trim();
    if (raw === '') return NaN;
    return Number(raw);
  }

  function inRange(value, range) {
    return isFinite(value) && value >= range[0] && value <= range[1];
  }

  function initCalculator() {
    var form = $('#calcForm');
    if (!form) return;

    var unitInputs = $$('input[name="units"]', form);
    function applyUnits() {
      var imperial = form.elements.units.value === 'imperial';
      $$('[data-unit]', form).forEach(function (group) {
        var show = group.getAttribute('data-unit') === (imperial ? 'imperial' : 'metric');
        group.classList.toggle('hidden', !show);
      });
      $('#calcResults').classList.add('hidden');
      $('#calcError').textContent = '';
    }
    unitInputs.forEach(function (r) { r.addEventListener('change', applyUnits); });
    applyUnits();

    function setText(id, value) {
      var el = document.getElementById(id);
      if (el) el.textContent = value;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var error = $('#calcError');
      error.textContent = '';

      var imperial = form.elements.units.value === 'imperial';
      var sex = form.elements.sex.value;
      var age = readNumber(form, 'age');
      var cm, kg;

      if (!inRange(age, CALC_LIMITS.age)) {
        error.textContent = 'Enter an age between 15 and 100.';
        form.elements.age.focus();
        return;
      }

      if (imperial) {
        var ft = readNumber(form, 'heightFt');
        var inch = readNumber(form, 'heightIn');
        if (isNaN(inch)) inch = 0; // inches are optional
        var lb = readNumber(form, 'weightLb');
        if (!inRange(ft, CALC_LIMITS.ft) || !inRange(inch, CALC_LIMITS.inch)) {
          error.textContent = 'Enter a height between 4 ft 0 in and 7 ft 11 in.';
          form.elements.heightFt.focus();
          return;
        }
        if (!inRange(lb, CALC_LIMITS.lb)) {
          error.textContent = 'Enter a weight between 80 and 550 lb.';
          form.elements.weightLb.focus();
          return;
        }
        cm = ft * 30.48 + inch * 2.54;
        kg = lb * 0.45359237;
      } else {
        cm = readNumber(form, 'heightCm');
        kg = readNumber(form, 'weightKg');
        if (!inRange(cm, CALC_LIMITS.cm)) {
          error.textContent = 'Enter a height between 120 and 230 cm.';
          form.elements.heightCm.focus();
          return;
        }
        if (!inRange(kg, CALC_LIMITS.kg)) {
          error.textContent = 'Enter a weight between 35 and 250 kg.';
          form.elements.weightKg.focus();
          return;
        }
      }

      var activity = parseFloat(form.elements.activity.value);
      var goal = form.elements.goal.value;

      // Mifflin-St Jeor resting metabolic rate.
      var bmr = 10 * kg + 6.25 * cm - 5 * age + (sex === 'male' ? 5 : -161);
      var tdee = bmr * activity;
      var adjust = { lose: -500, maintain: 0, gain: 300 }[goal] || 0;
      var target = tdee + adjust;

      // Safety floor: never recommend below a common minimum intake.
      var floor = sex === 'female' ? 1200 : 1500;
      var note = 'Protein is set at 2.0 g per kg of body weight; fat at 25% of calories; carbohydrates fill the rest.';
      if (target < floor) {
        target = floor;
        note = 'Your calculated target was below ' + floor.toLocaleString('en-US') + ' kcal, so it has been raised to that minimum. ' + note;
      }

      target = Math.round(target);

      var protein = 2.0 * kg;
      var fat = (target * 0.25) / 9;
      var carbs = Math.max(0, (target - protein * 4 - fat * 9) / 4);

      setText('resBmr', Math.round(bmr).toLocaleString('en-US'));
      setText('resTdee', Math.round(tdee).toLocaleString('en-US'));
      setText('resTarget', Math.round(target).toLocaleString('en-US'));
      setText('resProtein', Math.round(protein));
      setText('resCarbs', Math.round(carbs));
      setText('resFat', Math.round(fat));
      setText('resNote', note);

      $('#calcResults').classList.remove('hidden');
    });
  }

  /* ------------------------------------------------------------------
   * 5. Scroll-spy highlight for desktop navigation
   * ------------------------------------------------------------------ */
  function initScrollSpy() {
    var links = $$('[data-nav]');
    if (!links.length) return;

    var sections = links
      .map(function (a) { return document.getElementById(a.getAttribute('data-nav')); })
      .filter(Boolean);

    function setActive(id) {
      links.forEach(function (a) {
        var on = a.getAttribute('data-nav') === id;
        a.classList.toggle('text-white', on);
        a.classList.toggle('border-cyan-400', on);
        a.classList.toggle('border-transparent', !on);
        if (on) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    }

    // The "current" section is the last one whose top has crossed a line
    // 40% down the viewport. Computed from scroll position, so it stays
    // correct during smooth scrolling and for tall sections.
    var ticking = false;
    function update() {
      ticking = false;
      var line = window.innerHeight * 0.4;
      var current = null;
      sections.forEach(function (section) {
        if (section.getBoundingClientRect().top <= line) current = section.id;
      });
      setActive(current);
    }
    window.addEventListener('scroll', function () {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    }, { passive: true });
    update();
  }

  /* ------------------------------------------------------------------
   * Boot
   * ------------------------------------------------------------------ */
  function init() {
    updateClubStatus();
    setInterval(updateClubStatus, 60 * 1000);
    initDrawer();
    initModal();
    initCalculator();
    initScrollSpy();

    var year = document.getElementById('year');
    if (year) year.textContent = String(new Date().getFullYear());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
