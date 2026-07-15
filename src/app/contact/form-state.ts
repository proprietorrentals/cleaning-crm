export type ContactActionState = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
};

export const contactInitialState: ContactActionState = {
  success: false,
  message: "",
};
