import RangeHandler from './range/handler'
import './style.css'
import template from './editor.html'
/**
 * Created by peak on 2017/2/9.
 */
export default {
    template,
    props: {
        content: {
            type: String,
            required: true,
            default: ''
        },
        height: {
            type: Number,
            default: 300,
            validator(val) {
                return val >= 100
            }
        },
        zIndex: {
            type: Number,
            default: 1000
        },
        autoHeight: {
            type: Boolean,
            default: true
        },
        showModuleName: {},
        axios: {
            default: null
        }
    },
    data() {
        return {
            // defaultShowModuleName:false
            // locale: {},
            // modules:{},
            fullScreen: false,
            dashboard: null
        }
    },
    watch: {
        content(val) {
            const content = this.$refs.content.innerHTML
            if (val !== content) {
                this.$refs.content.innerHTML = val
            }
            this.$emit('update:content', val)
        },
        fullScreen(val) {
            const component = this
            if (val) {
                component.parentEl = component.$el.parentNode
                component.nextEl = component.$el.nextSibling
                document.body.appendChild(component.$el)
                return
            }
            if (component.nextEl) {
                component.parentEl.insertBefore(component.$el, component.nextEl)
                return
            }
            component.parentEl.appendChild(component.$el)
        }
    },
    computed: {
        contentStyle() {
            const style = {}
            if (this.fullScreen) {
                style.height = `${window.innerHeight - this.$refs.toolbar.clientHeight - 1}px`
                return style
            }
            if (!this.autoHeight) {
                style.height = `${this.height}px`
                return style
            }
            style['min-height'] = `${this.height}px`
            return style
        }
    },
    methods: {
        toggleFullScreen() {
            this.fullScreen = !this.fullScreen
        },
        enableFullScreen() {
            this.fullScreen = true
        },
        exitFullScreen() {
            this.fullScreen = false
        },
        focus() {
            this.$refs.content.focus()
        },
        toggleDashboard(dashboard) {
            this.dashboard = this.dashboard === dashboard ? null : dashboard
        },
        onPaste(event) {
            const vm = this
            event.preventDefault()

            const clipboardData = event.clipboardData
            return Array.prototype.forEach.call(clipboardData.types, (type, i) => {
                let file
                console.log(type)
                if (
                    type === 'Files' ||
                    clipboardData.items[i].type === 'Files'
                ) {
                    file = clipboardData.items[i].getAsFile()

                    const formData = new FormData()
                    formData.append('img', file)
                    formData.append('file_name', file.name)

                    vm.axios
                        .post('/api/image/upload', formData, {
                            headers: {
                                'Content-Type': 'multipart/form-data'
                            }
                        })
                        .then((response) => {
                            vm.$refs.content.innerHTML += `<img src="${response.data.data}">`
                            vm.$emit('change', vm.$refs.content.innerHTML)
                        })
                } else {
                    vm.$refs.content.innerHTML += (event.originalEvent || event).clipboardData.getData('text/html')
                    vm.$emit('change', vm.$refs.content.innerHTML)
                }
            })
        },
        execCommand(command, arg) {
            this.restoreSelection()
            if (this.range) {
                new RangeHandler(this.range).execCommand(command, arg)
            }
            this.toggleDashboard()
            this.$emit('change', this.$refs.content.innerHTML)
        },
        emitBlur() {
            this.$emit('blur')
        },
        getCurrentRange() {
            return this.range
        },
        saveCurrentRange() {
            const selection = window.getSelection ? window.getSelection() : document.getSelection()
            if (!selection.rangeCount) {
                return
            }
            const content = this.$refs.content
            for (let i = 0; i < selection.rangeCount; i++) {
                const range = selection.getRangeAt(0)
                let start = range.startContainer
                let end = range.endContainer
                    // for IE11 : node.contains(textNode) always return false
                start = start.nodeType === Node.TEXT_NODE ? start.parentNode : start
                end = end.nodeType === Node.TEXT_NODE ? end.parentNode : end
                if (content.contains(start) && content.contains(end)) {
                    this.range = range
                    break
                }
            }
        },
        restoreSelection() {
            const selection = window.getSelection ? window.getSelection() : document.getSelection()
            selection.removeAllRanges()
            if (this.range) {
                selection.addRange(this.range)
            } else {
                const content = this.$refs.content
                const div = document.createElement('div')
                const range = document.createRange()
                content.appendChild(div)
                range.setStart(div, 0)
                range.setEnd(div, 0)
                selection.addRange(range)
                this.range = range
            }
        },
        activeModule(module) {
            if (typeof module.handler === 'function') {
                module.handler(this)
                return
            }
            if (module.hasDashboard) {
                this.toggleDashboard(`dashboard-${module.name}`)
            }
        }
    },
    created() {
        this.modules.forEach((module) => {
            if (typeof module.init === 'function') {
                module.init(this)
            }
        })
    },
    mounted() {
        const content = this.$refs.content
        content.innerHTML = this.content
        content.addEventListener('mouseup', this.saveCurrentRange, false)
        content.addEventListener('keyup', () => {
            this.$emit('change', content.innerHTML)
            this.saveCurrentRange()
        }, false)
        content.addEventListener('mouseout', (e) => {
            if (e.target === content) {
                this.saveCurrentRange()
            }
        }, false)
        this.touchHandler = (e) => {
            if (content.contains(e.target)) {
                this.saveCurrentRange()
            }
        }

        window.addEventListener('touchend', this.touchHandler, false)
    },
    updated() {
        // update dashboard style
        if (this.$refs.dashboard) {
            this.$refs.dashboard.style.maxHeight = `${this.$refs.content.clientHeight}px`
        }
    },
    beforeDestroy() {
        window.removeEventListener('touchend', this.touchHandler)
        this.modules.forEach((module) => {
            if (typeof module.destroyed === 'function') {
                module.destroyed(this)
            }
        })
    }
}