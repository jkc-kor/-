/* 음악 이론 공통 데이터 & 유틸 */
window.GL = window.GL || {};

GL.music = (function () {
  const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];
  const PC_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const PC_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  const ROOTS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

  // 줄 번호 1(하이 E) ~ 6(로우 E)의 개방현 MIDI
  const OPEN = { 1: 64, 2: 59, 3: 55, 4: 50, 5: 45, 6: 40 };

  function pcOf(name) {
    let pc = LETTER_PC[LETTERS.indexOf(name[0])];
    for (const ch of name.slice(1)) {
      if (ch === '#') pc++;
      else if (ch === 'b') pc--;
      else if (ch === 'x') pc += 2;
    }
    return ((pc % 12) + 12) % 12;
  }

  const INTERVALS = {
    R: { s: 0, d: 1 }, b9: { s: 1, d: 2 }, 9: { s: 2, d: 2 }, '#9': { s: 3, d: 2 },
    b3: { s: 3, d: 3 }, 3: { s: 4, d: 3 }, 11: { s: 5, d: 4 }, '#11': { s: 6, d: 4 },
    b5: { s: 6, d: 5 }, 5: { s: 7, d: 5 }, b13: { s: 8, d: 6 }, 13: { s: 9, d: 6 },
    b7: { s: 10, d: 7 }, 7: { s: 11, d: 7 }
  };

  /** 근음 + 음정 이름 → 올바른 철자의 음이름 (예: C + #11 = F#, C + b13 = Ab) */
  function spell(rootName, interval) {
    const iv = INTERVALS[interval];
    const li = (LETTERS.indexOf(rootName[0]) + iv.d - 1) % 7;
    const target = (pcOf(rootName) + iv.s) % 12;
    let diff = (((target - LETTER_PC[li]) % 12) + 12) % 12;
    if (diff > 6) diff -= 12;
    const acc = diff === 2 ? 'x' : diff > 0 ? '#'.repeat(diff) : 'b'.repeat(-diff);
    return LETTERS[li] + acc;
  }

  function pcName(pc, preferFlat) {
    return (preferFlat ? PC_FLAT : PC_SHARP)[((pc % 12) + 12) % 12];
  }

  function prefersFlat(rootName) {
    return rootName.includes('b') || rootName === 'F';
  }

  const TENSION_ORDER = ['b9', '9', '#9', '11', '#11', 'b13', '13'];
  const TENSION_GROUPS = [
    { key: '9', title: '9th 계열', items: ['b9', '9', '#9'] },
    { key: '11', title: '11th 계열', items: ['11', '#11'] },
    { key: '13', title: '13th 계열', items: ['b13', '13'] }
  ];

  const CHORDS = {
    maj7: {
      sym: 'maj7', name: '메이저 7', tones: ['R', '3', '5', '7'],
      tensions: ['9', '#11', '13'], avoid: { 11: '3음(E)과 반음 충돌 → 어보이드 노트' }
    },
    m7: {
      sym: 'm7', name: '마이너 7', tones: ['R', 'b3', '5', 'b7'],
      tensions: ['9', '11', '13'], avoid: {}
    },
    dom7: {
      sym: '7', name: '도미넌트 7', tones: ['R', '3', '5', 'b7'],
      tensions: ['b9', '9', '#9', '11', '#11', 'b13', '13'],
      avoid: { 11: '3음과 반음 충돌 → 3음을 빼고 sus4(9sus4) 사운드로 사용' }
    },
    m7b5: {
      sym: 'm7(b5)', name: '하프 디미니쉬', tones: ['R', 'b3', 'b5', 'b7'],
      tensions: ['9', '11', 'b13'], avoid: {}
    }
  };

  const TENSION_INFO = {
    b9: '근음에서 단2도(옥타브 위). 도미넌트 전용 – 강한 긴장감, 마이너 키(Ⅰm)로 해결될 때 특히 잘 어울림.',
    9: '근음에서 장2도(옥타브 위). 가장 무난하고 많이 쓰는 텐션 – CCM 발라드의 기본 색채.',
    '#9': '단3도와 같은 음(이명동음). 도미넌트 전용 – 블루지·펑키한 사운드 (일명 "헨드릭스 코드").',
    11: '완전4도(옥타브 위). m7에서 가장 자연스러움. maj7·7에서는 3음과 부딪혀 sus4 형태로 사용.',
    '#11': '증4도(옥타브 위). maj7 → 리디안 사운드, 7 → 리디안 b7 사운드. 몽환적이고 열린 느낌.',
    b13: '단6도(옥타브 위). 도미넌트(얼터드, 마이너 해결)와 m7(b5)에서 사용 – 어둡고 끈적한 색.',
    13: '장6도(옥타브 위). maj7·7에서 밝고 세련된 사운드. m7에서는 도리안(Ⅱm7) 맥락에서 사용.'
  };

  /** 코드 타입별 반음 → 음정 라벨 */
  function labelMap(type) {
    const c = CHORDS[type];
    const map = {};
    [...c.tones, ...c.tensions].forEach((iv) => { map[INTERVALS[iv].s] = iv; });
    return map;
  }

  const SCALES = {
    major: { name: '메이저 (아이오니안)', iv: [0, 2, 4, 5, 7, 9, 11] },
    minor: { name: '내추럴 마이너 (에올리안)', iv: [0, 2, 3, 5, 7, 8, 10] },
    penta_minor: { name: '마이너 펜타토닉', iv: [0, 3, 5, 7, 10] },
    penta_major: { name: '메이저 펜타토닉', iv: [0, 2, 4, 7, 9] },
    blues: { name: '블루스', iv: [0, 3, 5, 6, 7, 10] },
    dorian: { name: '도리안', iv: [0, 2, 3, 5, 7, 9, 10] },
    mixolydian: { name: '믹솔리디안', iv: [0, 2, 4, 5, 7, 9, 10] },
    lydian: { name: '리디안', iv: [0, 2, 4, 6, 7, 9, 11] },
    harmonic_minor: { name: '하모닉 마이너', iv: [0, 2, 3, 5, 7, 8, 11] }
  };

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  return {
    LETTERS, PC_SHARP, PC_FLAT, ROOTS, OPEN, INTERVALS, CHORDS, TENSION_ORDER,
    TENSION_GROUPS, TENSION_INFO, SCALES, pcOf, spell, pcName, prefersFlat, labelMap, shuffle, pick
  };
})();
