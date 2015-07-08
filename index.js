!(function() {
	var dirname = function(url) {
		return /^((.*)[\\\/]|\.)[^\\\/]*$/.exec(url)[1];
	}
	/*
	Рефакторинг модуля позволяет вытаскивать расширенные компоненты, такие как отдельные
	функции или опциональные части.
	В файле components.json в пункте optional могут быть указаны алиасы для получаения
	конкретных файлов, кроме того данная опция может являться путем до файла.
	*/
	var moduleRefactory = function(module, optional, callback) {
		var url = this.location+module.exports.scripts[0];
		if (optional.length>0) {
			
			if ("object"===typeof module.exports.optional&&module.exports.optional[optional]==="string") {
				/*
				Переходим по опциональной ссылке
				*/
				url = this.location+module.exports.optional[optional];
			} else {
				/*
				Используем путь как относительный (относительно основного скрипта)
				*/
				url = dirname(url)+optional;
			}
		}
		
		vendor([url], function(content) {
			callback(content);
		});
	}

	Vendor.config({	
		requireAlias: 'vendor',
		aliases: {
			'components': 'components/',
			'abstudio': 'http://studio:88/components/',
			'polyvitamins': 'http://studio:88/polyvitamins/'
		},
		rerouting: [
			{
				expr: /component\.json/,
				handler: function(module) {
					var resource = this;
					if ("object"!==typeof module.exports) {
						throw "component.json is corrupt [Module: "+this.location+"]"
					} else {
						
						var depends = [], names = [];
						/*
						Что бы избежать разногласок с зависимости будет производиться
						проверка запрашиваемой версии
						*/
						if (resource.hash==='master'||module.exports.version===resource.hash) {
							/*
							Производим инициализацию базовых зависимостей модуля
							*/
							if ("object"===typeof module.exports.dependencies) {

								for (var submod in module.exports.dependencies) {
										var mmn = submod.split('/');
										var linkName = mmn.join('~')+'@'+module.exports.dependencies[submod];
										names.push(linkName);
										
										if ("string"===typeof Vendor.config.aliases[mmn[0]]) {
											depends.push(mmn[0]+'//'+mmn[1]+'/component.json#'+module.exports.dependencies[submod]);
										} else {
											depends.push('components//'+mmn[0]+'/'+mmn[1]+'/'+module.exports.dependencies[submod]+'/component.json');
										}
								}
							}

							var cb = function() {

								moduleRefactory.call(resource, module, [], function(content) {
									module.exports = content;
									resource.module = module;
									resource.ready();
								});
							}

							if (depends.length>0) {
								vendor(depends, function() {
									var mod = this;
									Array.prototype.slice.apply(arguments).forEach(function(module, index) {

										Vendor.register(names[index], {exports: module, refactory: function(options, callback) {
											/*
											Обращаемся к ресурсам модуля, что бы найти рефакторинг для данного кокнетного модуля
											*/
											mod.resources[index].module.refactory(options, callback);
										}.bind(this.resources)});
									});
									cb();
								});
							} else {
								cb();
							};

							module.refactory = function(location, optional, callback) {
								moduleRefactory.call({location:location}, {exports:this}, optional, function(content) {
									callback.call(resource, content);
								});
							}.bind(module.exports, resource.location)
							
						} else {
							throw new Error('Undefined component version '+resource.url+'#'+resource.hash);
						}
					}
				}
			}
		]
	});
})();