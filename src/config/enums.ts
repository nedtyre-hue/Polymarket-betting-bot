export const USER_ALLOW_STATUS = {
  ALLOW: 'allow',
  BLOCK: 'block',
} as const;

export type UserAllowStatus = (typeof USER_ALLOW_STATUS)[keyof typeof USER_ALLOW_STATUS];

export const USER_ALLOW_STATUS_VALUES = Object.values(USER_ALLOW_STATUS) as UserAllowStatus[];

export const DEFAULT_USER_ALLOW_STATUS = USER_ALLOW_STATUS.ALLOW;

