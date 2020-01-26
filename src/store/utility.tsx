export const updateObject = (oldObject: any, updatedProperties: any) => {
  return {
    ...oldObject, // takes the old object and update keys from updatedProperties
    ...updatedProperties
  };
};
