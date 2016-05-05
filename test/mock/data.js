'use strict';

module.exports = {
  user: [
    { login: 'dale', email: 'daleoooo.z@gmail.com' },  
    { login: 'mm', email: 'mm@gmail.com' }  // 美美
  ],

  profile: [
    { user_id: 1, description: 'I am nobody' },
    { user_id: 2, description: 'I am mm' }
  ],

  department: [
    { user_id: 1, description: 'Spacious, Bright, Ceiling window' },
    { user_id: 1, description: 'Double, Swimming pool, Garage' },
    { user_id: 2, description: 'Pink, Bay window' }
  ],

  tag: [
    { name: 'hacker' },
    { name: 'fool' },
    { name: 'beautiful' },
    { name: 'interpreter' },
    { name: 'happy' }
  ],

  user_tags: [
    { user_id: 1, tag_id: 1 },
    { user_id: 1, tag_id: 2 },
    { user_id: 1, tag_id: 5 },
    { user_id: 2, tag_id: 3 },
    { user_id: 2, tag_id: 4 },
    { user_id: 2, tag_id: 5 }
  ]
}
