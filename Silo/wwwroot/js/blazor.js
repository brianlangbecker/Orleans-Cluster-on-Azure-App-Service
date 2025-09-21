window.blazorHelpers = {
    scrollToFragment: function (elementId) {
        var element = document.getElementById(elementId);
        if (element) {
            element.scrollIntoView();
            window.location.hash = elementId;
        }
    },
    focusElement: function (element) {
        element.focus();
    },
    getWindowDimensions: function () {
        return {
            width: window.innerWidth,
            height: window.innerHeight
        };
    },
    registerResizeCallback: function (dotNetHelper) {
        window.addEventListener('resize', () => {
            dotNetHelper.invokeMethodAsync('OnBrowserResize', {
                width: window.innerWidth,
                height: window.innerHeight
            });
        });
    }
};
