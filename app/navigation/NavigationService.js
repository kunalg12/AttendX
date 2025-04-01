import { CommonActions } from '@react-navigation/native';

let navigator;

export const setNavigator = (nav) => {
  navigator = nav;
};

export const navigate = (name, params) => {
  navigator.dispatch(
    CommonActions.navigate({
      name,
      params,
    })
  );
};

export const reset = (name, params) => {
  navigator.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name, params }],
    })
  );
};

export const goBack = () => {
  navigator.dispatch(CommonActions.goBack());
};