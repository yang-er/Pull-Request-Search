import * as React from "react";
import { Header, TitleSize } from "azure-devops-ui/Header";

export interface IPluginHeaderProps {
    onRefresh?: () => void;
}

export function WidgetHeader(props: IPluginHeaderProps) {
    return (
        <Header
            title="Pull Request Search"
            commandBarItems={[
                {
                    iconProps: { iconName: 'Refresh' },
                    id: 'refresh-page',
                    text: 'Refresh',
                    isPrimary: true,
                    onActivate: props.onRefresh
                },
                {
                    id: 'write-review',
                    text: 'Write a review',
                    href: 'https://marketplace.visualstudio.com/items?itemName=ottostreifel.pull-request-search',
                    target: '_blank',
                    important: false,
                },
                {
                    id: 'report-issue',
                    text: 'Report an issue',
                    href: 'https://github.com/ostreifel/Pull-Request-Search/issues',
                    target: '_blank',
                    important: false,
                },
                {
                    id: 'feedback-questions',
                    text: 'Feedback and questions',
                    href: 'mailto:prsearchextension@microsoft.com',
                    target: '_blank',
                    important: false,
                }
            ]}
            titleSize={TitleSize.Large}
        />
    );
}
