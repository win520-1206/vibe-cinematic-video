import React from 'react';
import {Composition} from 'remotion';
import raw from '../project-contract.json';
import {normalize} from '../shared/project.mjs';
import {Film} from './Film';
const project=normalize(raw);
export const Root=()=> <>{project.episodes.map((e:any)=><Composition key={e.id} id={e.id} component={Film} defaultProps={{project,episode:e}} fps={project.video.fps} width={project.video.width} height={project.video.height} durationInFrames={e.durationInFrames}/>)}</>;
