MANIFEST	:= manifest.json
PACKAGE 	:= zendesk-submit-expander.zip
ICONS		:= icon16.png icon48.png icon128.png
SOURCES		:= rip.css

.PHONY: all clean

all: $(PACKAGE)

$(PACKAGE): $(MANIFEST) $(ICONS) $(SOURCES) clean
	zip -r $(PACKAGE) $(MANIFEST) $(ICONS) $(SOURCES)

clean:
	rm -f $(PACKAGE)
