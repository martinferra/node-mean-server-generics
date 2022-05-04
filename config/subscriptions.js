var callbacksBySubsPath = new Map();
var subsPathsByCallback = new Map();

var subsPathsByPublishPath = new Map();
var publishPathsBySubsPath = new Map();

var callbacksByPublishPath = new Map();
var publishPathsByCallback = new Map();

function match(publishPath, subsPath) {
    let publishPathArr = publishPath.split('/');
    let subsPathArr = subsPath.split('/');
    if(publishPathArr.length < subsPathArr.length) {
        return false;
    }
    let idx = 0;
    for(step of subsPathArr) {
        if(step !== '#' && step !== publishPathArr[idx]) {
            return false;
        }
        idx++;
    }
    return true;
}

function setAsimetricRelationship(map, value1, value2) {
    let innerMap = map.get(value1) || new Map();
    innerMap.set(value2,null);
    map.set(value1, innerMap);
}

function setSimetricRelationship(map1, map2, value1, value2) {
    setAsimetricRelationship(map1, value1, value2);
    setAsimetricRelationship(map2, value2, value1);
}

function unsetAsimetricRelationship(map, value1, value2, del) {
    let innerMap = map.get(value1);
    innerMap?.delete(value2);
    if(del && !innerMap?.size) {
        map.delete(value1);
    }
}

function unsetSimetricRelationship(map1, map2, value1, value2, del1=true, del2=true) {
    unsetAsimetricRelationship(map1, value1, value2, del1);
    unsetAsimetricRelationship(map2, value2, value1, del2);
}

function subscribe(subsPath, cb) {
    
    if(!callbacksBySubsPath.get(subsPath)?.has(cb)) {
        if(!callbacksBySubsPath.has(subsPath)) {
            callbacksByPublishPath.forEach((callbacks, publishPath)=>{
                if(match(publishPath, subsPath)) {
                    setSimetricRelationship(publishPathsBySubsPath, subsPathsByPublishPath, subsPath, publishPath);
                    setSimetricRelationship(callbacksByPublishPath, publishPathsByCallback, publishPath, cb);
                }
            })
        }
        setSimetricRelationship(callbacksBySubsPath, subsPathsByCallback, subsPath, cb);
    }
}

function unsubscribe(subsPath, cb) {
    if(!callbacksBySubsPath.get(subsPath)?.has(cb)) {
        return;
    }
    unsetSimetricRelationship(callbacksBySubsPath, subsPathsByCallback, subsPath, cb);
    if(!callbacksBySubsPath.get(subsPath)) {
        publishPathsBySubsPath.get(subsPath)?.forEach((value, publishPath)=>{
            unsetSimetricRelationship(publishPathsBySubsPath, subsPathsByPublishPath, subsPath, publishPath);
        })
    }
    if(!subsPathsByCallback.get(cb)) {
        publishPathsByCallback.get(cb)?.forEach((value, publishPath)=>{
            unsetSimetricRelationship(publishPathsByCallback, callbacksByPublishPath, cb, publishPath, true, false);
        })
    }
}

function getCallbacksByPublishPath(publishPath) {
    let callbacksMap = callbacksByPublishPath.get(publishPath);
    if(!callbacksMap) {
        callbacksMap = new Map();
        callbacksByPublishPath.set(publishPath, callbacksMap);
        callbacksBySubsPath.forEach((callbacks, subsPath)=>{
            if(match(publishPath, subsPath)) {
                setSimetricRelationship(publishPathsBySubsPath, subsPathsByPublishPath, subsPath, publishPath);
                callbacksBySubsPath.get(subsPath).forEach((value, cb)=>{
                    setSimetricRelationship(callbacksByPublishPath, publishPathsByCallback, publishPath, cb);
                });
            }
        });
    };
    return callbacksMap;
}

function publish(path, payload) {
    getCallbacksByPublishPath(path).forEach((value, callback)=>callback({path, payload}));
}

module.exports = { publish, subscribe, unsubscribe }