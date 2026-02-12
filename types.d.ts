declare module '*.png' {
    const value: any;
    export = value;
}

declare module 'react-native-vector-icons/MaterialIcons' {
    import { Icon } from 'react-native-vector-icons/Icon';
    export default Icon;
}