// This is the fake one?
/* @jsx jsx */
import { css, jsx } from '@emotion/react';
import * as React from 'react';
import { setup } from '../setupGLSL';

export type PlayState = 'playing' | 'paused' | 'recording' | 'transcoding';

export type GLSLEnv = {
    type: 'GLSLEnv';
    time: number;
    resolution: Vec2;
    camera: Vec3;
    mouse: Vec2;
};
export type Vec2 = { type: 'Vec2'; x: number; y: number };
export type Vec3 = { type: 'Vec3'; x: number; y: number; z: number };
export type Vec4 = { type: 'Vec4'; x: number; y: number; z: number; w: number };

export type OpenGLFn = (glslEnv: GLSLEnv, fragCoord: Vec2) => any;

export const newGLSLEnv = (canvas: HTMLCanvasElement): GLSLEnv => ({
    type: 'GLSLEnv',
    time: 0,
    resolution: {
        type: 'Vec2',
        x: canvas.width,
        y: canvas.height,
    },
    camera: { type: 'Vec3', x: 0.0, y: 0.0, z: -5.0 },
    mouse: {
        type: 'Vec2',
        x: canvas.width / 2,
        y: canvas.height / 2,
    },
});

const makeFfmpeg = (
    onFrame: (frame: number) => void,
    onDone: (url: string) => void,
) => {
    const ffmpeg = new Worker('./ffmpeg-worker-mp4.js');

    // const totalSeconds = Math.PI * 4;

    ffmpeg.onmessage = function (e) {
        var msg = e.data;
        switch (msg.type) {
            case 'stdout':
            case 'stderr':
                if (msg.data.startsWith('frame=')) {
                    const frame = +(msg.data as string)
                        .slice('frame='.length)
                        .trimStart()
                        .split(' ')[0];
                    onFrame(frame);
                }
                console.log(msg.data);
                // messages += msg.data + "\n";
                break;
            case 'exit':
                console.log('Process exited with code ' + msg.data);
                //worker.terminate();
                break;

            case 'done':
                const blob = new Blob([msg.data.MEMFS[0].data], {
                    type: 'video/mp4',
                });
                onDone(URL.createObjectURL(blob));
                break;
        }
    };

    return (images: Array<{ name: string; data: Uint8Array }>) => {
        ffmpeg.postMessage({
            type: 'run',
            TOTAL_MEMORY: 268435456,
            //arguments: 'ffmpeg -framerate 24 -i img%03d.jpeg output.mp4'.split(' '),
            arguments: [
                '-r',
                '60',
                '-i',
                'img%03d.jpg',
                '-c:v',
                'libx264',
                '-crf',
                '18',
                '-pix_fmt',
                'yuv420p',
                '-vb',
                '20M',
                'out.mp4',
            ],
            MEMFS: images,
        });
    };
};

export const OpenGLCanvas = ({
    shaders,
    startPaused,
    onTrace,
    onError,
    renderTrace,
    initialSize = 200,
}: {
    initialSize?: number;
    startPaused: boolean;
    shaders: Array<string>;
    onError: (e: Error) => void;
    // For tracing, optional
    onTrace?: (
        mousePos: { x: number; y: number },
        time: number,
        canvas: HTMLCanvasElement,
    ) => void;
    renderTrace?: (
        trace: any,
        mousePos: { x: number; y: number },
    ) => React.ReactNode;
}) => {
    const [width, setWidth] = React.useState(initialSize);
    const [canvas, setCanvas] = React.useState(
        null as null | HTMLCanvasElement,
    );
    const [restartCount, setRestartCount] = React.useState(0);
    const [playState, setPlayState] = React.useState(
        (startPaused ? 'paused' : 'playing') as PlayState,
    );
    const [showSettings, toggleSettings] = React.useState(false);

    const [tracing, setTracing] = React.useState(false);
    const [transcodingProgress, setTranscodingProgress] = React.useState(0.0);
    const [recordingLength, setRecordingLength] = React.useState(
        Math.ceil(2 * Math.PI * 60),
    );

    const timer = React.useRef(0);

    const [video, setVideo] = React.useState(null as null | string);

    const [mousePos, setMousePos] = React.useState({ x: 0, y: 0, button: -1 });
    const currentMousePos = React.useRef(mousePos);
    currentMousePos.current = mousePos;

    const traceValue = React.useMemo(() => {
        if (!tracing || !canvas || !onTrace) {
            return null;
        }
        return onTrace(mousePos, timer.current, canvas);
    }, [tracing, mousePos, onTrace]);

    const textures = React.useRef([]);

    const restart = () => {
        setRestartCount(restartCount + 1);
        textures.current = [];
    };

    const updateFn = React.useMemo(() => {
        if (!canvas || !shaders) {
            return null;
        }
        const ctx = canvas.getContext('webgl2');
        if (!ctx) {
            return;
        }
        try {
            const update = setup(
                ctx,
                shaders[0],
                timer.current,
                currentMousePos.current,
                shaders.slice(1),
                textures.current,
            );
            return update;
        } catch (err) {
            console.log(err);
            onError(err);
        }
    }, [canvas, shaders, restartCount]);

    React.useEffect(() => {
        if (
            !updateFn ||
            playState === 'paused' ||
            playState === 'transcoding'
        ) {
            return;
        }
        if (playState === 'recording') {
            const sendRun = makeFfmpeg(
                (frame) => setTranscodingProgress(frame / recordingLength),
                setVideo,
            );

            const images: Array<{ name: string; data: Uint8Array }> = [];

            let tid: any;
            let tick = 0;
            const fn = () => {
                updateFn(tick / 60, currentMousePos.current);

                const dataUrl = canvas!.toDataURL('image/jpeg');
                const data = convertDataURIToBinary(dataUrl);

                images.push({
                    name: `img${tick.toString().padStart(3, '0')}.jpg`,
                    data,
                });

                if (tick++ > recordingLength) {
                    sendRun(images);
                    setPlayState('transcoding');

                    return; // done
                }
                tid = requestAnimationFrame(fn);
            };
            tid = requestAnimationFrame(fn);
            return () => cancelAnimationFrame(tid);
        } else {
            let tid: any;
            let last = Date.now();
            const fn = () => {
                const now = Date.now();
                timer.current += (now - last) / 1000;
                last = now;
                updateFn(timer.current, currentMousePos.current);
                tid = requestAnimationFrame(fn);
            };
            tid = requestAnimationFrame(fn);
            return () => cancelAnimationFrame(tid);
        }
    }, [updateFn, playState, restartCount]);

    return (
        <div
            onMouseDown={(evt) => {
                evt.stopPropagation();
            }}
            onClick={(evt) => {
                evt.stopPropagation();
            }}
        >
            <div
                css={{
                    position: 'relative',
                    display: 'inline-block',
                    [`:hover .hover`]: {
                        opacity: 1.0,
                    },
                }}
            >
                <canvas
                    onMouseMove={(evt) => {
                        const box = (evt.target as HTMLCanvasElement).getBoundingClientRect();
                        setMousePos({
                            x: (evt.clientX - box.left) * 2,
                            y: (box.height - (evt.clientY - box.top)) * 2,
                            button: evt.button != null ? evt.button : -1,
                        });
                    }}
                    ref={(node) => {
                        if (node && !canvas) {
                            setCanvas(node);
                        }
                    }}
                    style={{
                        width: width,
                        height: width,
                    }}
                    // Double size for retina
                    width={width * 2 + ''}
                    height={width * 2 + ''}
                />
                <div css={hover} className="hover">
                    <IconButton
                        icon="play_arrow"
                        selected={playState === 'playing'}
                        onClick={() => {
                            if (playState !== 'playing') {
                                setPlayState('playing');
                            }
                        }}
                    />
                    <IconButton
                        icon="pause"
                        selected={playState === 'paused'}
                        onClick={() => {
                            if (playState !== 'paused') {
                                setPlayState('paused');
                            }
                        }}
                    />
                    <IconButton
                        icon="replay"
                        selected={false}
                        onClick={() => {
                            timer.current = 0;
                            if (playState !== 'playing') {
                                setPlayState('playing');
                            }
                            restart();
                        }}
                    />
                    <IconButton
                        icon="circle"
                        onClick={() => {
                            timer.current = 0;
                            setPlayState('recording');
                            restart();
                        }}
                        selected={playState === 'recording'}
                    />
                    <IconButton
                        icon="settings"
                        onClick={() => toggleSettings(!showSettings)}
                        selected={showSettings}
                    />
                </div>
            </div>
            {showSettings ? (
                <div>
                    Width:
                    <input
                        value={width + ''}
                        onChange={(evt) => {
                            const value = +evt.target.value;
                            if (!isNaN(value)) {
                                setWidth(value);
                            }
                        }}
                    />
                    {renderTrace ? (
                        tracing && traceValue ? (
                            renderTrace(traceValue, mousePos)
                        ) : (
                            <button onClick={() => setTracing(true)}>
                                Trace
                            </button>
                        )
                    ) : null}
                    Recording length (frames):
                    <input
                        value={recordingLength.toString()}
                        onChange={(evt) => {
                            const value = parseInt(evt.target.value);
                            if (!isNaN(value)) {
                                setRecordingLength(value);
                            }
                        }}
                    />
                </div>
            ) : null}
            {transcodingProgress > 0
                ? `Transcoding: ${(transcodingProgress * 100).toFixed(2)}%`
                : null}
            {video ? <video src={video} loop controls /> : null}
        </div>
    );
};

function convertDataURIToBinary(dataURI: string) {
    var base64 = dataURI.replace(/^data[^,]+,/, '');
    var raw = window.atob(base64);
    var rawLength = raw.length;

    var array = new Uint8Array(new ArrayBuffer(rawLength));
    for (let i = 0; i < rawLength; i++) {
        array[i] = raw.charCodeAt(i);
    }
    return array;
}

export const IconButton = ({
    icon,
    onClick,
    selected,
}: {
    icon: string;
    onClick: () => void;
    selected?: boolean;
}) => {
    return (
        <button
            onClick={onClick}
            css={{
                backgroundColor: 'transparent',
                border: 'none',
                padding: 4,
                margin: 0,
                cursor: 'pointer',
                transition: '.2s ease color',
                fontSize: '80%',
                color: '#2a5e7d',
                ':hover': {
                    color: '#9edbff',
                },
                ...(selected ? { color: '#24aeff' } : undefined),
            }}
        >
            <span
                className="material-icons"
                css={{
                    // textShadow: '1px 1px 0px #aaa',
                    fontSize: 20,
                    pointerEvents: 'visible',
                }}
            >
                {icon}
            </span>
        </button>
    );
};

const hover = css({
    opacity: 0,
    // backgroundColor: 'rgba(50, 50, 50, 0.1)',
    paddingTop: 2,
    transition: '.3s ease opacity',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
});
