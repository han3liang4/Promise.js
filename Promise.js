(function(property_name){
	if(typeof exports !="undefined"){
		exports[property_name]=P;
	}else if(typeof define =="undefined"){//�����AMDģ�鵼��Ļ����������޸ĺ���
		var _global = window;
		_global[property_name]=P;
	}
var createAsyc=function(fc,layzy_count){//fc�ص�������layzy_count��ʱ�������ڣ�return ������ʱ���ڵĺ�����asycFun��
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
function P(fs,_flag){//_flag  is private �벻Ҫʹ��_flag��������Ժ�������������
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
			if(reject.length==0){//reject��������û�д��������׳��쳣
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
				(createAsyc(res,2))(val);//����ӳ�������������(�ⲻ��promise�淶���벻Ҫ���������б�̣������Ժ��иĶ�����鷳)
			}else{
				(createAsyc(rej,2))(val);
			}
		}catch(e){
			(createAsyc(rej,2))(e);
		}
	}
	var then_=function(r,f){
		return new P(function(res,rej){//��������p����
			r = typeof r =="function" ? r : res;
			f = typeof f =="function" ? f : rej;
			if(state=="fulfilled"){//�ж�promise�����Ƿ��Ѿ�������ϣ����������ϣ������ٴε���
				(createAsyc(create_callback.bind(null,res,rej,r,value)))();
			}
			if(state=="rejected"){//�ж�promise�����Ƿ��Ѿ�������ϣ����������ϣ������ٴε���
				(createAsyc(create_callback(res,rej,f,value)))();
			}
			if(state=="pending"){
				resolve.push(create_callback.bind(null,res,rej,r));
				reject.push(create_callback.bind(null,res,rej,f));
			}
		});
	}
	var catch_ = function(f){
		return new P(function(res,rej){//��������p����
			f = typeof f == "function" ? f : rej;
			if(state=="rejected"){//�ж�promise�����Ƿ��Ѿ�������ϣ����������ϣ������ٴε���
				(createAsyc(create_callback(res,rej,f,value)))();
			}
			if(state=="pending"){
				reject.push(create_callback.bind(null,res,rej,f));
			}
		});
	}
	finally_=function(fin){
		return new P(function(res,rej){//��������p����
			fin = fin ? fin : function(){};
			if(state!="pending"){//�ж�promise�����Ƿ��Ѿ�������ϣ����������ϣ������ٴε���
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
	var p=new P(createAsyc(function(res,rej){//��������p����
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
	return new P(function(res,rej){//��������p����
		rej(v);
	});
}
P.all =function(arr){
	var values=[];
	var p=new P(function(res,rej){//��������p����
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
	return new P(function(res,rej){//��������p����
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
})("Promise")//ȫ�ֵ����������ߵ�����������