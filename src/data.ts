import type { StageId, TextItem } from './types'

export const stages: Array<{ id: StageId; label: string; short: string; focus: string; marker: string }> = [
  { id: 'V0', label: 'Sound check', short: 'Know your sounds', focus: 'A quick, kind check of the sounds you already know.', marker: '◌' },
  { id: 'V1', label: 'Blend words', short: 'Slide sounds together', focus: 'Read short words, then your first tiny sentences.', marker: '◍' },
  { id: 'V2', label: 'More short words', short: 'Read and spell', focus: 'Use more consonants and all five short vowels.', marker: '◌' },
  { id: 'V3', label: 'Word endings', short: 'Read bigger words', focus: 'Read endings such as -nd, -st, and -mp.', marker: '◌' },
  { id: 'V4', label: 'Word starts', short: 'Read blends', focus: 'Read starts such as sl-, tr-, and gr-.', marker: '◌' },
  { id: 'V5', label: 'New sound teams', short: 'Read sh, ch, th', focus: 'Read common sound teams and clusters.', marker: '◌' },
  { id: 'V6', label: 'Read stories', short: 'Read for meaning', focus: 'Read a short story, then talk about it.', marker: '★' },
]

export const placementGraphemes = [
  { letter: 'a', sound: '/ă/' }, { letter: 'e', sound: '/ĕ/' }, { letter: 'i', sound: '/ĭ/' }, { letter: 'o', sound: '/ŏ/' }, { letter: 'u', sound: '/ŭ/' },
  { letter: 'm', sound: '/m/' }, { letter: 's', sound: '/s/' }, { letter: 'f', sound: '/f/' }, { letter: 'n', sound: '/n/' }, { letter: 'r', sound: '/r/' },
  { letter: 'l', sound: '/l/' }, { letter: 'v', sound: '/v/' }, { letter: 'z', sound: '/z/' }, { letter: 't', sound: '/t/' }, { letter: 'p', sound: '/p/' },
  { letter: 'c', sound: '/k/' }, { letter: 'd', sound: '/d/' }, { letter: 'g', sound: '/g/' }, { letter: 'b', sound: '/b/' }, { letter: 'h', sound: '/h/' },
]

export const irregularWords = ['a', 'I', 'the', 'is', 'was', 'to', 'of', 'said', 'you', 'are', 'he', 'she', 'we', 'me', 'be', 'do', 'does', 'have', 'has', 'come', 'some', 'one', 'two', 'they', 'my']

export const instructionalTexts: TextItem[] = [
  { id: 's-01', stage: 'V1', title: 'Sam sat.', sentences: ['Sam sat.'] },
  { id: 's-02', stage: 'V1', title: 'A man is in a van.', sentences: ['A man is in a van.'] },
  { id: 's-03', stage: 'V1', title: 'I can nap.', sentences: ['I can nap.'] },
  { id: 's-04', stage: 'V1', title: 'A ram is in a van.', sentences: ['A ram is in a van.'] },
  { id: 's-05', stage: 'V2', title: 'A red hen can hop.', sentences: ['A red hen can hop.'] },
  { id: 's-06', stage: 'V2', title: 'Tim has a big map.', sentences: ['Tim has a big map.'] },
  { id: 's-07', stage: 'V3', title: 'A nest is in the sand.', sentences: ['A nest is in the sand.'] },
  { id: 's-08', stage: 'V4', title: 'The frog can swim.', sentences: ['The frog can swim.'] },
  { id: 's-09', stage: 'V5', title: 'She has a shell.', sentences: ['She has a shell.'] },
  { id: 's-10', stage: 'V5', title: 'The chip is in a box.', sentences: ['The chip is in a box.'] },
  { id: 'm-01', stage: 'V2', title: 'A big red hen', sentences: ['A big red hen is in a pen.', 'The hen can hop.', 'I can hop too.'] },
  { id: 'm-02', stage: 'V2', title: 'Tim and his map', sentences: ['Tim has a map.', 'Tim can see a red dot.', 'Tim is at the dot.'] },
  { id: 'm-03', stage: 'V3', title: 'A camp', sentences: ['We can camp in a tent.', 'The tent is not big.', 'It is fun.'] },
  { id: 'm-04', stage: 'V3', title: 'A pond', sentences: ['A frog is at a pond.', 'The frog can jump.', 'We can see it.'] },
  { id: 'm-05', stage: 'V4', title: 'The flag', sentences: ['A flag is on a clip.', 'The flag can flap.', 'The wind is big.'] },
  { id: 'm-06', stage: 'V4', title: 'A crab', sentences: ['A crab can grab a snack.', 'The crab is in a pond.', 'We can see the crab.'] },
  { id: 'm-07', stage: 'V5', title: 'A ship', sentences: ['She can see a ship.', 'The ship is not far.', 'She can shout.'] },
  { id: 'm-08', stage: 'V5', title: 'A chin', sentences: ['The chip is on his chin.', 'He can fix it.', 'He is glad.'] },
  { id: 'm-09', stage: 'V5', title: 'The thick stick', sentences: ['The stick is thick.', 'The stick is in the mud.', 'We can drag it.'] },
  { id: 'm-10', stage: 'V5', title: 'A whiff', sentences: ['We can smell a whiff.', 'It is from a fish.', 'We can shut the lid.'] },
  { id: 'p-01', stage: 'V6', title: 'Sam and the fish', sentences: ['Sam is at a pond. Sam can see a fish. The fish can swim. The fish can swim at the pond. Sam can see the pond. Sam has a snack. The fish is in the pond. Sam can see the fish.'] },
  { id: 'p-02', stage: 'V6', title: 'The red tent', sentences: ['We can camp in a red tent. Tim has a map. Tim can see a pond. We can see a frog jump. The frog is at the pond. We can see the tent. It is a fun camp.'] },
  { id: 'p-03', stage: 'V6', title: 'The crab', sentences: ['A crab is in a pond. The crab can grab a snack. The crab can jump in mud. We can see the crab. We can see the crab at the pond. The crab is at the pond. The crab can grab a fish.'] },
  { id: 'p-04', stage: 'V6', title: 'The ship', sentences: ['She can see a ship. The ship is far. The ship has a big flag. A fish can swim at the ship. She can see the flag. She can see the ship. She can see the pond.'] },
  { id: 'p-05', stage: 'V6', title: 'A snack', sentences: ['We can have a snack. I can have a fish. She can have a chip. Tim can have a big snack. We can see a tent. We can have a big snack. It is fun.'] },
  { id: 'p-06', stage: 'V6', title: 'The thick mud', sentences: ['The pond has thick mud. Tim can jump in mud. We can grab a stick. We can see the pond. The frog can jump. The fish can swim. Tim can see the frog.'] },
  { id: 'p-07', stage: 'V6', title: 'The nest', sentences: ['A nest is at the pond. We can see the nest. We do not grab the nest. A fish can swim at the pond. A frog can jump at the pond. We can see the pond. We can see the nest.'] },
  { id: 'p-08', stage: 'V6', title: 'A fun camp', sentences: ['We can camp at a pond. We can see a tent. Tim can see a fish. She can see a frog. The frog can jump. The fish can swim. We can have a snack. It is fun.'] },
  { id: 'p-09', stage: 'V6', title: 'The shell', sentences: ['She has a shell. The shell is in a box. She can see the shell. I can see the shell. We can see the pond. A fish can swim. She can grab the shell. The shell is big.'] },
  { id: 'p-10', stage: 'V6', title: 'The big map', sentences: ['Tim has a big map. The map is in a tent. Tim can see a pond on the map. He can see a camp on the map. We can see the camp. We can see a fish at the pond.'] },
]

export const assessmentTexts: TextItem[] = [
  { id: 'a-01', stage: 'V6', title: 'The pond camp', assessment: true, sentences: ['Tim can camp at a pond. Tim has a map. Tim has a tent. We can see a frog jump. We can see a fish swim. The fish is in the pond. Tim can grab a snack. We can see the pond. It is fun.'] },
  { id: 'a-02', stage: 'V6', title: 'The shell and ship', assessment: true, sentences: ['She has a shell in a box. She can see a ship at a pond. The ship has a big flag. We can see a fish swim. She can grab the shell. We can see the ship. The shell is big. It is fun.'] },
]
