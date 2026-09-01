import type { LimbId } from "../core/types";

export type PoseMap = Partial<Record<LimbId, number>>;

export const IdlePose: PoseMap = {
  torso: 0,
  pelvis: 0,
  head: 0,
  upperArmL: 0.35,
  upperArmR: -0.45,
  forearmL: 0.2,
  forearmR: 0.15,
  thighL: 0.08,
  thighR: -0.08,
  shinL: -0.05,
  shinR: 0.05,
  footL: 0,
  footR: 0,
};

export function walkPose(t: number, facing: number): PoseMap {
  const s = Math.sin(t);
  const c = Math.cos(t);
  return {
    torso: facing * 0.08,
    pelvis: 0,
    head: -facing * 0.05,
    thighL: s * 0.55,
    thighR: -s * 0.55,
    shinL: Math.max(0, -s) * 0.5,
    shinR: Math.max(0, s) * 0.5,
    footL: -c * 0.15,
    footR: c * 0.15,
    upperArmL: -s * 0.4,
    upperArmR: s * 0.4,
    forearmL: 0.25,
    forearmR: 0.2,
  };
}

export function crouchPose(facing: number): PoseMap {
  return {
    torso: facing * 0.15,
    pelvis: 0.12,
    head: -0.1,
    thighL: 0.7,
    thighR: 0.65,
    shinL: -1.1,
    shinR: -1.05,
    upperArmL: 0.5,
    upperArmR: -0.3,
  };
}

export function jumpPose(): PoseMap {
  return {
    thighL: -0.35,
    thighR: 0.15,
    shinL: -0.2,
    shinR: -0.4,
    upperArmL: -1.1,
    upperArmR: 1.0,
    torso: 0.05,
  };
}

export function blockPose(facing: number): PoseMap {
  return {
    upperArmL: facing > 0 ? -0.2 : 1.2,
    upperArmR: facing > 0 ? -1.3 : 0.2,
    forearmL: facing > 0 ? 0.4 : 1.1,
    forearmR: facing > 0 ? -0.2 : 0.5,
    torso: facing * 0.12,
    head: -facing * 0.1,
  };
}

export function staggerPose(facing: number): PoseMap {
  return {
    torso: -facing * 0.4,
    head: -facing * 0.5,
    upperArmL: -1.2,
    upperArmR: 1.1,
    thighL: 0.3,
    thighR: -0.2,
  };
}
