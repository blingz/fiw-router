var http = require('http')
var util = require('util')
var mq = require('mq')
var assert = require('assert')

var EventEmitter = require('events')
var evt = new EventEmitter()

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

  //router
  let router = function (r) {
    try {
      mq.invoke(chain, r)
    }catch(error) {
      error && console.debug(error.message, error.stack)
      if(!r.response.isEnded()) {
        mq.invoke(errorChain, {request: r, error: error})
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
      }
    }else if(util.isFunction(args[0])) {
      chain.append(args[0])
      return router
    }
    assert.ok(false, "parameter incorrect.")
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
      if(util.isObject(args[0])) {
        //TODO
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
  
  return router
}
