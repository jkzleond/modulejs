(function(window,document){
	var queue = [];

	function processQueue(){
		var msg = queue.shift();
		if (msg == null)
			return;
		msg();
		setTimeout(processQueue,0);
	}

	function addMessage(func){
		if(queue.length == 0) setTimeout(processQueue,0);
		queue.push(func);
	}

	function addMessages(funcs){
		for(var i = 0;i < funcs.length;i++){
			addMessage(funcs[i]);
		}
	}

	function Module(modName){
		var deps = deps || [];
		if(modName in Module.mods){
			return Module.mods[modName];
		}
		this.id = Module.numMod++;
		this.modName = modName || 'anonymousMod#' + this.id;
		this.depends = [];
		//reverseDepends
		this.revDepends = [];
		this.unReadyDeps = [];
		Module.mods[modName] = this;
		this.readyState = Module.READY_STATE_STAND;
	}

	Module.prototype = {
		init:function(deps,define){
			this.define = define;
			if(deps.length == 0){
				this._ready();
			}else{
				for(var i = 0;i < deps.length;i++){
					var dep = Module.obtain(deps[i]);
					this.addDepend(dep);
				}
				this._depLoad();	
			}
		},
		//add reverse depend
		addRevDepend:function(childMod){
			if(this.revDepends.indexOf(childMod) == -1)
				this.revDepends.push(childMod);
		},
		//add depend
		addDepend:function(parentMod){
			if(this.depends.indexOf(parentMod) == -1){
				this.depends.push(parentMod);
				this.unReadyDeps.push(parentMod.modName);
				parentMod.addRevDepend(this);
			}
		},
		//load module with adding script element
		load:function(){
			if(this.readyState == Module.READY_STATE_LOADING){
				return;				
			}else if(this.readyState == Module.READY_STATE_LOADED){
				return;
			}else if(this.readyState == Module.READY_STATE_READY){
				this._notifyReady();
				return;
			}
			var script = document.createElement('script');
			script.type = 'text/javascript';
			script.src = this.modName + '.js';
			script.async = true;
			document.head.appendChild(script);
			var self = this;
			script.addEventListener('load',function(){
				// this.parentElement.removeChild(script);
				self.onload();
			});
			this.readyState = Module.READY_STATE_LOADING;
		},
		//load depend modules
		_depLoad:function(){
			var len = this.depends.length;
			for(var i = 0; i < len; i++){
				this.depends[i].load();
			}
		},
		//notify reverse depend module that i'm ready
		_notifyReady:function(){
			var len = this.revDepends.length;
			for(var i = 0;i < len;i++){
				this.revDepends[i].handleDependReady(this.modName);
			}
		},
		//do something when depend module ready
		//remove name of depend module who notify from my unreadyDeps
		handleDependReady:function(modName){
			if(this.readyState == Module.READY_STATE_READY)
				return;
			
			if(this.unReadyDeps.length > 0)
				this.unReadyDeps.splice(this.unReadyDeps.indexOf(modName),1);
			//notify ready when all depend modules are ready
			if(this.unReadyDeps.length == 0)
				this._ready();
		},
		onload:function(){
			if(!this.unReadyDeps.length == 0)
				this.readyState == Module.READY_STATE_LOADED;
		},
		_ready:function(){
			this.readyState = Module.READY_STATE_READY;
			var imports = [];
			var len = this.depends.length;
			for(var i = 0; i < len; i++){
				imports[i] = this.depends[i].export;
			}
			this.export = this.define.apply(window,imports);
			this._notifyReady();
		}

	};

	Module.numMod = 0;
	Module.mods = {};
	Module.READY_STATE_STAND = 0;
	Module.READY_STATE_LOADING = 1;
	Module.READY_STATE_LOADED = 2;
	Module.READY_STATE_READY = 3;

	Module.obtain = function(modName){
		if(Module.mods[modName] === undefined){
			Module.mods[modName] = new Module(modName);
		}
		return Module.mods[modName];
	}

	Module.require = function(mods,callback){
		if(typeof mods == 'string')
			mods = [mods];
		Module.define(null,mods,callback);
	}

	Module.define = function(modName,deps,define){
		if(arguments.length < 2){
			throw new Error('can not define ' + modName + 'without definition');
		}else if(arguments.length == 2){
			var define = arguments[1];
			var deps = [];
		}
		var mod = Module.obtain(modName);
		mod.init(deps,define);
	}
	window.m = Module;
	window.require = Module.require;
	window.define = Module.define;
})(window,document);