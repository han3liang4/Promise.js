(function(property_name){
	if(typeof exports !="undefined"){
		exports[property_name]=P;
	}else if(typeof define =="undefined"){//如果有AMD模块导入的话，请自行修改函数
		var _global = window;
		_global[property_name]=P;
	}
var createAsyc=function(fc,layzy_count){//fc回调函数，layzy_count延时调用周期，return 带有延时周期的函数（asycFun）
	var layzy_count= layzy_count ? layzy_count : 1;
	var asycFun=asycWrap.bind(null,fc);
	layzy_count--;
	function asycWrap(fc_,v_){
		var t;
		t=setTimeout(function (){
			clearTimeout(t);
			fc_(v_);
		},0);
	}
	for(var i=0;i<layzy_count;i++){
		asycFun=asycWrap.bind(null,asycFun);
	}
	return asycFun;
}
function P(fs,_flag){//_flag  is private 请不要使用_flag标记以免以后升级出现问题
	var state="pending";
	var value;
	var resolve=[],reject=[];
	var callback;
	var resolve_=function(v){
		if(state=="pending"){
			value=v;
			state="fulfilled";
			reject.length=0;
			while(callback=resolve.shift()){
				callback(value);
			}
			callback=null;
		}
	}
	var reject_=function(v){
		if(state=="pending"){
			value=v;
			state="rejected";
			resolve.length=0;
			if(reject.length==0){//reject队列里面没有错误处理函数抛出异常
				console.error("Uncaught(in promise) " + value);//throw "(in promise) " + value;
			};
			while(callback=reject.shift()){
				callback(value);
			}
			callback=null;
		}
	}
	var create_callback=function(res,rej,fun,val){
		try{
			var v=fun(val);
			res(v);
		}catch(e){
			rej(e);
		}
	}
	var create_finally=function(res,rej,fun,val){
		try{
			fun();
			if(state=="fulfilled"){
				(createAsyc(res,2))(val);//向后延迟两个调用周期(这不是promise规范，请不要依赖它进行编程，以免以后有改动造成麻烦)
			}else{
				(createAsyc(rej,2))(val);
			}
		}catch(e){
			(createAsyc(rej,2))(e);
		}
	}
	var then_=function(r,f){
		return new P(function(res,rej){//继续构造p对象
			r = typeof r =="function" ? r : res;
			f = typeof f =="function" ? f : rej;
			if(state=="fulfilled"){//判断promise对象是否已经调用完毕，如果调用完毕，进行再次调用
				(createAsyc(create_callback.bind(null,res,rej,r,value)))();
			}
			if(state=="rejected"){//判断promise对象是否已经调用完毕，如果调用完毕，进行再次调用
				(createAsyc(create_callback(res,rej,f,value)))();
			}
			if(state=="pending"){
				resolve.push(create_callback.bind(null,res,rej,r));
				reject.push(create_callback.bind(null,res,rej,f));
			}
		});
	}
	var catch_ = function(f){
		return new P(function(res,rej){//继续构造p对象
			f = typeof f == "function" ? f : rej;
			if(state=="rejected"){//判断promise对象是否已经调用完毕，如果调用完毕，进行再次调用
				(createAsyc(create_callback(res,rej,f,value)))();
			}
			if(state=="pending"){
				reject.push(create_callback.bind(null,res,rej,f));
			}
		});
	}
	finally_=function(fin){
		return new P(function(res,rej){//继续构造p对象
			fin = fin ? fin : function(){};
			if(state!="pending"){//判断promise对象是否已经调用完毕，如果调用完毕，进行再次调用
				create_finally(res,rej,fin,value);
			}
			if(state=="pending"){
				fin=create_finally.bind(null,res,rej,fin);
				resolve.push(fin);
				reject.push(fin);
			}
		});
	}
	var p={
		"then":then_,
		"catch":catch_,
		"finally":finally_
	}
	p.constructor=P;
	var asyc_reject=createAsyc(reject_);
	try{
		fs(createAsyc(resolve_),asyc_reject);
	}catch(e){
		asyc_reject(e);
	}
	if(_flag){
		p["_resolve"]=resolve_;
		p["_reject"]=reject_;
	}
	return p
}
P.resolve =function(v){
	var p=new P(createAsyc(function(res,rej){//继续构造p对象
		var then = v && v["then"];
		if(typeof then =="function"){
			v["then"](function(v){
				var then = v && v["then"];
				if(typeof then =="function"){
					if(p == v){
						throw "promise cannot be resolved with itself and itself child chain"
					}
					v["then"](res,rej);
				}
			},rej);
		}else{
			res(v);
		}
	}));
	return p;
}
P.reject =function(v){
	return new P(function(res,rej){//继续构造p对象
		rej(v);
	});
}
P.all =function(arr){
	var values=[];
	var p=new P(function(res,rej){//继续构造p对象
		var item;
		var then;
		for(var i=0;i<arr.length;i++){
			item = arr[i];
			then = item && item["then"];
			if(typeof then =="function"){
				item["then"](function(i,v){
					values[i]=v;
					if(values.length == arr.length){
						res(values);
					}
				}.bind(null,i),rej);
			}else{
				values[i]=item;
				if(values.length == arr.length){
					res(values);
				}
			}	
		}
	},true);
	if(arr instanceof Array && arr.length==0){
		p["_resolve"].call(null,values);
		delete p["_resolve"];
		delete p["_reject"];
	}
	return p;
}
P.race =function(arr){
	return new P(function(res,rej){//继续构造p对象
		var item;
		var then;
		for(var i=0;i<arr.length;i++){
			item = arr[i];
			then = item && item["then"];
			if(typeof then =="function"){
				item["then"](res,rej);
			}else{
				res(item);
			}	
		}
	});
}
return P;
})("Promise")//全局的属性名或者导出的属性名