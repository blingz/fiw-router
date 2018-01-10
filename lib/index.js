let http = require('http')
let util = require('util')
let mq = require('mq')

function Router (...args) {

  let _chain = null;
  let _route = null;
  let _error = null;
  let kv = {};

  //router
  let router = function (r) {
    try {
      _chain && mq.invoke(_chain, r)
    }catch(error) {
      console.debug('value:', r.value, 'error:', (error&&error.message)||error)
      r.error = error
      _error && mq.invoke(_error, r)
    }
  }

  Object.defineProperties(router, {
    chain: {
      get: function() { return _chain = _chain || new mq.Chain([]), _chain }
    },
    route: {
      get: function() {
        if(!_route) {
          _route = new mq.Routing({})
          this.chain.append(_route)
        }
        return _route
      }
    }
  })

  /**
   * use('/abc/123', function(r) { ... })
   * use(function(r) { ... })
   */
  router.use = function (...args) { 
    if(util.isString(args[0])) {
      if(util.isFunction(args[1])     //function
        || args[1] && util.isFunction(args[1].invoke)  //hanlder (hack)
        || util.isObject(args[1])) {  //object
        this.route.append(args[0], args[1])
      }
    }else {
      for(var i=0; i<args.length; i++) {
        if(util.isFunction(args[i])         //function
          || args[1] && util.isFunction(args[1].invoke)) {   //hanlder (hack)
          this.chain.append(args[i])
        }else if(util.isObject(args[i])) {  //object
          this.route.append(args[i])
        }
      }
    }
    return this
  }

  /**
   * error handler
   */ 
  router.error = function (...args) {
    if(!_error) {
      _error = Router()
    }
    _error.use(...args);
  }

  /**
   * _method(method, Object map)
   * _method(method, path, callback)
   */
  function _method(method, ...args) {
    var rt = router.route
    if(rt[method] && args.length > 0) {
      rt[method](...args)
    }
    return this
  }

  ['post', 'put', 'del','patch'].forEach(m => {
    router[m] = function (...args) {
      return _method('put', ...args)
    }
  })

  /**
   * get(Object map)
   * get(path, callback)
   */
  router.get = function (...args) {
    if(args.length == 1) {
      if(util.isString(args[0])) {
        return kv[args[0]] || args[1] || null
      }else if(util.isObject(args[0])) {
        _method('get', args[0])
      }
    }else if(args.length > 1) {
       _method('get', ...args)
    }
    return this
  }

  /**
   * set(key, value)
   * get(key) return value
   */
  router.set = function(key, value) {
    key && (kv[key] = value)
  }



  /**
   * static file
   */
  router.static = function (url, dir, base) {
    return this.use(url, this.fileHandler(dir, base))
  }

  /**
   * return fibjs http.fileHandler
   */
  router.fileHandler = function (dir, base) {
    if(base) {
      return http.fileHandler(path.join(base, dir))
    }
    return http.fileHandler(dir)
  }
  

  if(args.length>0) {
    router.use(...args)
  }
  return router
}

module.exports = Router