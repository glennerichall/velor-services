export function createInstance(Clazz, ...args) {
    return () => {
        return new Clazz(...args);
    }
}