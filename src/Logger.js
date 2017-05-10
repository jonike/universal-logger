import { EventEmitter } from 'events';
import StackTrace from 'stacktrace-js';
import defaultHandler from './handlers/default';
import LogLevel from './LogLevel';
import { TRACE, DEBUG, INFO, WARN, ERROR, OFF } from './constants';

class Logger extends EventEmitter {
    namespace = '';
    level = OFF;
    stacktrace = {
        enable: false,
        options: {
            // Set `offline` to true to prevent all network requests
            offline: true
        }
    };
    chainedHandlers = [
        defaultHandler()
    ];

    constructor(namespace, options) {
        super();

        if (typeof namespace === 'object') {
            options = namespace;
            namespace = ''; // master
        }

        const { level = this.level } = { ...options };
        this.namespace = namespace;
        this.setLevel(level);
    }
    invokeChainedHandlers(level, messages) {
        let i = 0;

        const context = {
            namespace: this.namespace,
            level: level,
            stackframes: []
        };
        const next = () => {
            const handler = (i < this.chainedHandlers.length) ? this.chainedHandlers[i] : null;
            if (!handler) {
                return;
            }

            ++i;
            handler({ ...context }, messages, next);
        };

        if (this.stacktrace.enable) {
            StackTrace
                .get({ ...this.stacktrace.options })
                .then(stackframes => {
                    context.stackframes = stackframes;

                    try {
                        this.emit('log', { ...context }, messages);
                        this.emit(level.name, { ...context }, messages);
                    } catch (e) {
                        // Ignore
                    }

                    next();
                });
        } else {
            try {
                this.emit('log', { ...context }, messages);
                this.emit(level.name, { ...context }, messages);
            } catch (e) {
                // Ignore
            }

            next();
        }
    }
    enableStackTrace(options) {
        this.stacktrace.enable = true;
        this.stacktrace.options = {
            ...this.stacktrace.options,
            ...options
        };
    }
    disableStackTrace() {
        this.stacktrace.enable = false;
    }
    // Changes the current logging level for the logging instance
    setLevel(level) {
        if (level instanceof LogLevel) {
            this.level = level;
        }

        this.emit('setLevel', this.level);

        return this.level;
    }
    // Returns the current logging level fo the logging instance
    getLevel() {
        return this.level;
    }
    log(level, ...messages) {
        if ((level instanceof LogLevel) && (level.value >= this.level.value)) {
            this.invokeChainedHandlers(level, messages);
        }
    }
    trace(...messages) {
        if (TRACE.value >= this.level.value) {
            this.invokeChainedHandlers(TRACE, messages);
        }
    }
    debug(...messages) {
        if (DEBUG.value >= this.level.value) {
            this.invokeChainedHandlers(DEBUG, messages);
        }
    }
    info(...messages) {
        if (INFO.value >= this.level.value) {
            this.invokeChainedHandlers(INFO, messages);
        }
    }
    warn(...messages) {
        if (WARN.value >= this.level.value) {
            this.invokeChainedHandlers(WARN, messages);
        }
    }
    error(...messages) {
        if (ERROR.value >= this.level.value) {
            this.invokeChainedHandlers(ERROR, messages);
        }
    }
}

export default Logger;
