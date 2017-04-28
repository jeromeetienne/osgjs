'use strict';

var imgElement = document.querySelector( '#placeholder' );
var videoElement = document.querySelector( '#video' );
var controls = document.querySelector( '#controls' );
var startButton = document.querySelector( '#capture-button' );
var stopButton = document.querySelector( '#stop-button' );
var viewer = document.querySelector( '#viewer' );
var modelInput = document.querySelector( '#model' );
var localMediaStream = null;

var videoSelect = document.querySelector( '#videoSource' );

//////// WebCam
var errorCallback = function ( e ) {
    console.error( e );

    // latest Draft of media Device compatibility
    // aka Firefox
    if ( e.message && e.message === 'audio and/or video is required' ) {
        var p = navigator.mediaDevices.getUserMedia( {
            audio: false,
            video: true
        } );

        p.then( function ( mediaStream ) {

            videoElement.src = window.URL.createObjectURL( mediaStream );

            videoElement.controls = false;
            localMediaStream = mediaStream;
            if ( urlIdsList.length === 1 ) {
                loadModel( getNodeList );
            }
        } );
    }
};

function gotDevices( deviceInfos ) {

    // Handles being called several times to update labels. Preserve values.
    var select = videoSelect;
    var value = select.value;

    while ( select.firstChild ) {
        select.removeChild( select.firstChild );
    }


    for ( var i = 0; i !== deviceInfos.length; ++i ) {
        var deviceInfo = deviceInfos[ i ];
        var option = document.createElement( 'option' );
        option.value = deviceInfo.deviceId;
        if ( deviceInfo.kind === 'videoinput' ) {
            option.text = deviceInfo.label || 'camera ' + ( videoSelect.length + 1 );
            videoSelect.appendChild( option );
        } else {
            console.log( 'Some other kind of source/device: ', deviceInfo );
        }
    }

    if ( Array.prototype.slice.call( select.childNodes ).some( function ( n ) {
            return n.value === value;
        } ) ) {
        select.value = value;
    }
}

if ( navigator.mediaDevices && navigator.mediaDevices.enumerateDevices ) {
    navigator.mediaDevices.enumerateDevices().then( gotDevices ).catch( errorCallback );
}
//////// WebCam

var rootNode;
var rootTransform;



////////// Main 
function start() {
    if ( localMediaStream ) {
        localMediaStream.getTracks().forEach( function ( track ) {
            track.stop();
        } );
    }
    var videoSource = videoSelect.value;
    var deviceId = videoSource ? {
        exact: videoSource
    } : undefined;

    var constraints;
    if ( navigator.getUserMedia ) {

        // old webrtc aka chrome
        constraints = {
            video: {
                optional: [ {
                    sourceId: videoSource
                } ]
            }
        };


        navigator.getUserMedia( constraints, function ( stream ) {

            videoElement.src = window.URL.createObjectURL( stream );
            //videoElement.srcObject = stream;
            videoElement.controls = false;
            localMediaStream = stream;
            if ( urlIdsList.length === 1 ) {

                loadModel( getNodeList );
            } else {
                //track();
            }
        }, errorCallback );
    } else if ( navigator.mediaDevices.getUserMedia ) {

        //REAL webrtc thank you
        constraints = {
            video: {
                deviceId: deviceId
            }
        };

        navigator.mediaDevices.getUserMedia( constraints )
            .then( function ( stream ) {

                //videoElement.src = window.URL.createObjectURL( stream );
                videoElement.srcObject = stream;
                videoElement.controls = false;
                localMediaStream = stream;
                if ( urlIdsList.length === 1 ) {

                    loadModel( getNodeList );
                } else {
                    //track();
                }
                // Refresh button list in case labels have become available
                return navigator.mediaDevices.enumerateDevices();
            } )
            .then( gotDevices )
            .catch( errorCallback );
    }

}
videoSelect.onchange = start;


navigator.getUserMedia = ( navigator.getUserMedia ||
    navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia ||
    navigator.msGetUserMedia );


startButton.addEventListener( 'click', function () {
    if ( navigator.getUserMedia ) {
        start();

    } else {
        errorCallback( {
            target: videoElement
        } );
    }
}, false );
////////// Main



///////// AR Markers
var intervalId;

stopButton.addEventListener( 'click', function () {
    window.clearInterval( intervalId );
}, false );


var sizeX = 640;
var sizeY = 480;
//sizeX = videoElement.clientWidth;
//sizeY = videoElement.clientHeight;

///////////////// jsartoolkit
var trackedMarker;
var param = new ARCameraParam();

param.onload = function () {

    var ar = new ARController(sizeX, sizeY, param);

    ar.debugSetup();

    // Set pattern detection mode to detect both pattern markers and barcode markers.
    // This is more error-prone than detecting only pattern markers (default) or only barcode markers.
    //
    // For barcode markers, use artoolkit.AR_MATRIX_CODE_DETECTION
    // For pattern markers, use artoolkit.AR_TEMPLATE_MATCHING_COLOR
    //
    //ar.setPatternDetectionMode(artoolkit.AR_TEMPLATE_MATCHING_COLOR_AND_MATRIX);
    ar.setPatternDetectionMode(artoolkit.AR_MATRIX_CODE_DETECTION);
    
    ar.addEventListener('markerNum', function (ev) {

      console.log('got markers', markerNum);


    });
    ar.addEventListener('getMarker', function (ev) {

            var tracked = ev.target.patternMarkers[trackedMarker];

                var scale = 1.0;
                
                if (tracked 
                    && rootTransform
                    && tracked.inCurrent
                    ){
                    
                    var mDest = rootTransform.getMatrix();
                    //rootTransform.setMatrix(mSrc);

                    var mSrc = ev.data.matrix;
                    ar.transMatToGLMat(mSrc,mDest );   

                    //mSrc = tracked.matrix;
                    //for(var i = 0; i < 12;i++){
                    //    mDest[i] = mSrc[i]
                    //}

                }

    });

    ar.loadMarker('Data/patt.hiro', function (marker) {
        
        trackedMarker = marker;
        var track = function () {

            //if ( videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {

                   //ar.process(videoElement);
            //}
            //else{

                    ar.process(imgElement);   

            //}

        }

        window.setInterval( track, 50);

    });
};

param.src = 'Data/camera_para.dat';

'use strict';

var OSG = window.OSG;
var osg = OSG.osg;
var osgDB = OSG.osgDB;
var osgViewer = OSG.osgViewer;

var main = function () {

    // The 3D canvas.
    var canvas = document.getElementById( 'View' );
    var viewer;

    // The viewer
    viewer = new osgViewer.Viewer( canvas );
    viewer.init();
    var rootNode = new osg.Node();
    viewer.setSceneData( rootNode );
    viewer.setupManipulator();
    viewer.run();

    var modelURL = '../media/models/material-test/file.osgjs';
    var request = osgDB.readNodeURL( modelURL );

    request.then( function ( model ) {


        var mtAbove = new osg.MatrixTransform();
        osg.mat4.rotateX( mtAbove.getMatrix(), mtAbove.getMatrix(), -Math.PI*0.5 );
        mtAbove.addChild( model );

        var mt = new osg.MatrixTransform();
        mt.addChild( mtAbove );
        rootTransform = mt;
        rootNode.addChild( mt );

        viewer.getManipulator().computeHomePosition();


        var loading = document.getElementById( 'loading' );
        document.body.removeChild( loading );

    } ).catch( function () {
        osg.warn( 'cant load ' + modelURL );
    } );
};

window.addEventListener( 'load', main, true );
