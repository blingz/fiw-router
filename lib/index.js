var http = require('http')
var util = require('util')
var mq = require('mq')
var assert = require('assert')
let EventEmitter = require('events')
var path = require('path')

//id
var id = 1

module.exports = Router

function Router () {

  // chain & routing
  let chain = new mq.Chain([])            //chain
  let errorChain = new mq.Chain([r=>{}])  //异常处理链chain
  let routing = null   //routing
  function getRouter () {
    if(!routing) {
      routing = new mq.Routing({})
      chain.append(routing)
    }
    return routing;
  }

  //event
  let evt = new EventEmitter()

  //kv
  let kv = {}

  //router
  let router = function (r) {
    try {
      mq.invoke(chain, r)
    }catch(error) {
      error && console.debug(`[${r.address}]`, error.message, error.stack)
      if(!r.response.isEnded()) {
        r.error = error
        mq.invoke(errorChain, r)
      }
    }
  }

  /**
   * id
   */
  router.id = id++

  /**
   * error chain
   * error(fn1, fn2 ...)
   */
  router.error = function (...fn) {
    for(var i=0; i<fn.length; i++) {
      if(util.isFunction(fn[i])) {
        errorChain.append(fn[i])
      }
    }
    return router
  }

  /**
   * event on
   * see EventEmitter
   */
  router.on = function(...args) {
    evt.on(...args)
    return router
  }

  /**
   * map
   */
  function _map(o, r, tab='\t') {
    r = r || new mq.Routing({})
    for (var k in o) {
      if (!o.hasOwnProperty(k)) continue;

      var n = o[k]
      if(n && util.isFunction(n) || n.invoke) {
        //console.debug(tab, '|--', k)
        r.append(k, n)
      } else if (n && util.isObject(n)) {
        //console.debug(tab, '|--', k)
        r.append(k, _map(n, null, tab+'\t'))
      }
    }
    if(tab.length>1) {
      return req => {
        mq.invoke(r, req)
      }
    }
    return r
  }

  /**
   * use('/abc/123', function(r) { ... })
   * use(function(r) { ... })
   */
  router.use = function (...args) {
    if(util.isString(args[0])) {
      let isFn = false
      if((isFn = util.isFunction(args[1])) //function
        || args[1] && args[1].invoke) {    //hanlder (hack)
        
        getRouter().append(args[0], args[1])
        return router
      }else if(util.isObject(args[1])) {
        //console.debug('use:', args[0])
        getRouter().append(args[0], _map(args[1]))
        return router
      }
    }else if(util.isFunction(args[0])) {
      chain.append(args[0])
      return router
    }else if(util.isObject(args[0])) {
      _map(args[0], getRouter())
      return router
    }
    
    assert.ok(false, "parameter incorrect:", args)
  }

  /**
   * set(key, value)
   * get(key) return value
   */
  router.set = function(key, value) {
    key && (kv[key] = value)
  }

  /**
   * _method(method, Object map)
   * _method(method, path, callback)
   */
  function _method(method, ...args) {
    var rt = getRouter()
    if(rt[method] && args.length > 0) {
      rt[method](...args)
    }
    return router
  }
  
  /**
   * method(method, Object map)
   * method(method, path, callback)
   */
  router.method = function (method, ...args) {
    return _method(method, ...args)
  }

  /**
   * get(Object map)
   * get(path, callback)
   */
  router.get = function (...args) {
    if(args.length == 1) {
      if(util.isString(args[0])) {
        return kv[args[0]]
      }else if(util.isObject(args[0])) {
        _method('get', args[0])
      }
    }else if(args.length > 1) {
       _method('get', ...args)
    }
    return router
  }

  /**
   * post(Object map)
   * post(path, callback)
   */
  router.post = function (...args) {
    return _method('post', ...args)
  }

  /**
   * put(Object map)
   * put(path, callback)
   */
  router.put = function (...args) {
    return _method('put', ...args)
  }

  /**
   * del(Object map)
   * del(path, callback)
   */
  router.del = function (...args) {
    return _method('del', ...args)
  }

  /**
   * patch(Object map)
   * patch(path, callback)
   */
  router.patch = function (...args) {
    return _method('patch', ...args)
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
  
  return router
}

