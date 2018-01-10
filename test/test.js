let test = require('test');
test.setup();

let mq = require('mq')
let router = require('../lib/index')

function msg(value, method) {
  var m = new mq.Message();
  m.value = value;
  m.method = method;
  return m
}

describe('router, test', () => {
    it('test router', () => {

      var cnt = {
        a: 0, 
        z: 0,
        z1: 0,
        c: 0,
        x: 0,
        y: 0,
        p: 0,
        q: 0
      };
      var r1 = router();
      r1.use(r => {
        cnt.a++;
      }).use('/123', r => {
        assert.equal('/123', r.value);
        cnt.c++;
      }).use('/abc/123', r => {
        assert.equal('/abc/123', r.value);
        cnt.c++;
      }).use({
        '/x': r => {
          //console.debug('\treq:', r.value);
          assert.equal('/x', r.value);
          cnt.x++;
        },
        '/y': {
          '/1': r => { 
            //console.debug('\treq:', r.value);
            assert.equal('/1', r.value); 
            cnt.y++; 
            //r.end();
          }
        }
      }).use({
        '/p': r => {
          //console.debug('\treq:', r.value);
          assert.equal('/p', r.value);
          cnt.p++;
        },
        '/q': {
          '/1': r => { 
            //console.debug('\treq:', r.value);
            assert.equal('/1', r.value); 
            cnt.q++; 
          }
        }
      }).use(r => {
        cnt.z++;
      }, r=>{
        cnt.z1++;
      })
      
      //console.debug('\tr1:', r1, 'chain:', r1.chain);

      mq.invoke(r1, msg('/123'));
      mq.invoke(r1, msg('/abc/123'));
      mq.invoke(r1, msg('/x'));
      mq.invoke(r1, msg('/y/1'));
      mq.invoke(r1, msg('/p'));
      mq.invoke(r1, msg('/q/1'));

      assert.equal(cnt.x, 1);
      assert.equal(cnt.y, 1);
      assert.equal(cnt.z, 6);
      assert.equal(cnt.a, 6);
      assert.equal(cnt.p, 1);
      assert.equal(cnt.q, 1);
    });


    it('test constructor', () => {

      var cnt = {a:0, x:0, y:0, z:0, e: 0};
      var r2 = router(r=>{
        cnt.a++
      }, {
        'x': r=> { cnt.x++; assert.equal('x', r.value)},
        'y': {
          '/1': {
            '/31': r=> { cnt.y++; assert.equal('/31', r.value)},
          }
        }
      }, r=>{
        cnt.z++;
      })

      r2.error(r=>{
        cnt.e++;
      })

      mq.invoke(r2, msg('x'));
      mq.invoke(r2, msg('y/1/31'));
      mq.invoke(r2, msg('y/1/unkown')); //unkown test

      assert.equal(cnt.a, 3);
      assert.equal(cnt.x, 1);
      assert.equal(cnt.y, 1);
      assert.equal(cnt.z, 2);  //unkown test

      assert.equal(cnt.e, 1);
    })



    it('test method: GET/POST', () => {

      var cnt = {a:0, b:0, c:0, d:0, x:0, y:0};
      var r1 = router();
      r1.get('x', r=>{
        cnt.x++;
        assert.equal('x', r.value); 
      });
      r1.post('y', r=>{
        cnt.y++;
        assert.equal('y', r.value); 
      });

      r1.put('a', r=>{
        cnt.a++;
        assert.equal('a', r.value); 
      });
      r1.del('b', r=>{
        cnt.b++;
        assert.equal('b', r.value); 
      });
      r1.patch('c', r=>{
        console.debug('\treq:', r.value, r.method);
        cnt.c++;
        assert.equal('c', r.value); 
      });
      
      mq.invoke(r1, msg('x', 'GET'));
      mq.invoke(r1, msg('y', 'POST'));

      mq.invoke(r1, msg('a', 'PUT'));
      mq.invoke(r1, msg('b', 'DELETE'));
      mq.invoke(r1, msg('c', 'PATCH'));

      mq.invoke(r1, msg('c', 'POST')); //POST -> PATCH

      assert.equal(cnt.x, 1);
      assert.equal(cnt.y, 1);
      assert.equal(cnt.a, 1);
      assert.equal(cnt.b, 1);
      assert.equal(cnt.c, 2); 
      console.error('\trouting未限制method')
    })


    it('test set/get', () => {

      var r1 = router();
      r1.set('test1', 123);
      assert.equal(r1.get('test1'), 123);
    })

});

test.run(console.DEBUG);