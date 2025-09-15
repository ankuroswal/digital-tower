function initMock()
{
const default_userId = 1;

  sup.set("server_data", {
    users: {
      [default_userId]: {
        userid: default_userId, 
        name: 'Hero',
        level: 1,
        hp: 100,
        maxHp: 100,
        mp: 30,
        maxMp: 30,
        attack: 10,
        defense: 8,
        speed: 2,
        exp: 0,
        gold: 0,
        inventory: [],
        position: { x: 200, y: 150 }
      }
    }
  });
}
