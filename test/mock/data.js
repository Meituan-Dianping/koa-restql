'use strict';

module.exports = {
  character: [
    { id: 1, name: 'Jon',      house_id: 1, is_bastard: true,  },  
    { id: 2, name: 'Arya',     house_id: 1 },  
    { id: 3, name: 'Daenerys', house_id: 2 },
    { id: 4, name: 'Tyrion',   house_id: 3 },
    { id: 5, name: 'Ramsay',   house_id: 5, is_bastard: true },
    { id: 6, name: 'Jaqen' }
  ],

  seat: [
    { id: 1, name: 'Winterfell',    house_id: 1 },
    { id: 2, name: 'Casterly Rock', house_id: 2 },
    { id: 3, name: 'Meereen',       house_id: 3 },
    { id: 4, name: 'Dreadfort',     house_id: 5 },
    { id: 5, name: 'Dragonstone' },
  ],

  house: [
    { id: 1, name: 'Stark',     words: 'Winter is Coming' },
    { id: 2, name: 'Targaryen', words: 'Fire and Blood' },
    { id: 3, name: 'Lannister', words: 'A Lannister Always Pays His Debts' },
    { id: 4, name: 'Tully',     words: 'Family, Duty, Honor' },
    { id: 5, name: 'Bolton',    words: 'Our Blades Are Sharp' }
  ],

  user: [
    { id: 1, name: 'Dale',    nickname: 'cg' },
    { id: 2, name: 'Jocelyn', nickname: 'mm' }
  ],

  user_characters: [
    { user_id: 1, character_id: 1, rate: 5 },
    { user_id: 1, character_id: 3, rate: 4 },
    { user_id: 1, character_id: 4, rate: 5 },
    { user_id: 1, character_id: 5, rate: -5 },
    { user_id: 2, character_id: 1, rate: 4 },
    { user_id: 2, character_id: 2, rate: 5 },
    { user_id: 2, character_id: 3, rate: 4 },
    { user_id: 2, character_id: 5, rate: -5 }
  ]
}
