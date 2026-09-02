import type { Schema, Struct } from '@strapi/strapi';

export interface CampusLifeSectionGallery extends Struct.ComponentSchema {
  collectionName: 'components_campus_life_section_galleries';
  info: {
    description: "One tab's photo set. The first image doubles as that tab's backdrop.";
    displayName: 'gallery';
  };
  attributes: {
    group: Schema.Attribute.Enumeration<
      ['infrastructure', 'ai-labs', 'events', 'fests', 'academic']
    > &
      Schema.Attribute.Required;
    images: Schema.Attribute.Media<'images', true> & Schema.Attribute.Required;
  };
}

export interface FaqSectionEntry extends Struct.ComponentSchema {
  collectionName: 'components_faq_section_entries';
  info: {
    description: 'One question and answer. Belongs to exactly one tab via `group`.';
    displayName: 'entry';
  };
  attributes: {
    answer: Schema.Attribute.Text & Schema.Attribute.Required;
    cta_label: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 40;
      }>;
    cta_link: Schema.Attribute.String;
    group: Schema.Attribute.Enumeration<
      ['general', 'admissions', 'academics', 'campus-life']
    > &
      Schema.Attribute.Required;
    question: Schema.Attribute.Text & Schema.Attribute.Required;
  };
}

export interface InnovationStartupsSectionGridTile
  extends Struct.ComponentSchema {
  collectionName: 'components_innovation_startups_section_grid_tiles';
  info: {
    description: 'One photo cell in the grid. The first gallery image is the cover.';
    displayName: 'grid-tile';
  };
  attributes: {
    caption: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
    gallery: Schema.Attribute.Media<'images', true> & Schema.Attribute.Required;
  };
}

export interface InnovationStartupsSectionPillar
  extends Struct.ComponentSchema {
  collectionName: 'components_innovation_startups_section_pillars';
  info: {
    description: 'One of the things the incubation centre does.';
    displayName: 'pillar';
  };
  attributes: {
    body: Schema.Attribute.Text & Schema.Attribute.Required;
    chips: Schema.Attribute.Component<
      'innovation-startups-section.pillar-chip',
      true
    > &
      Schema.Attribute.SetMinMax<
        {
          max: 6;
        },
        number
      >;
    glyph: Schema.Attribute.Enumeration<
      ['lattice', 'orbit', 'ascent', 'broadcast']
    > &
      Schema.Attribute.Required;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
  };
}

export interface InnovationStartupsSectionPillarChip
  extends Struct.ComponentSchema {
  collectionName: 'components_innovation_startups_section_pillar_chips';
  info: {
    description: 'One capability chip under a pillar.';
    displayName: 'pillar-chip';
  };
  attributes: {
    label: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 40;
      }>;
  };
}

export interface InnovationStartupsSectionStartup
  extends Struct.ComponentSchema {
  collectionName: 'components_innovation_startups_section_startups';
  info: {
    description: 'One funded student venture.';
    displayName: 'startup';
  };
  attributes: {
    clip: Schema.Attribute.Media<'videos'>;
    clip_poster: Schema.Attribute.Media<'images'>;
    description: Schema.Attribute.Text & Schema.Attribute.Required;
    founders: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
      }>;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    sector: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 40;
      }>;
    video_url: Schema.Attribute.String;
  };
}

export interface InnovationStartupsSectionStat extends Struct.ComponentSchema {
  collectionName: 'components_innovation_startups_section_stats';
  info: {
    description: 'One tile in the ecosystem bento.';
    displayName: 'stat';
  };
  attributes: {
    label: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    prefix: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 4;
      }>;
    tone: Schema.Attribute.Enumeration<['ink', 'red', 'track', 'plain']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'plain'>;
    value: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 20;
      }>;
  };
}

export interface InternationalSectionAdvantageCard
  extends Struct.ComponentSchema {
  collectionName: 'components_international_section_advantage_cards';
  info: {
    description: 'One card in the Distinct Global Advantage list.';
    displayName: 'advantage-card';
  };
  attributes: {
    description: Schema.Attribute.Text & Schema.Attribute.Required;
    image: Schema.Attribute.Media<'images'> & Schema.Attribute.Required;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
      }>;
  };
}

export interface MomentsMilestoneSectionMomentCard
  extends Struct.ComponentSchema {
  collectionName: 'components_moments_milestone_section_moment_cards';
  info: {
    description: 'One card in the sticky stack: badge, headline, body, photo, two stat tiles.';
    displayName: 'moment-card';
  };
  attributes: {
    badge: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    body: Schema.Attribute.Text & Schema.Attribute.Required;
    head_italic: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
    head_sans: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
    head_tail: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
    image: Schema.Attribute.Media<'images'> & Schema.Attribute.Required;
    image_caption: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
      }>;
    image_treatment: Schema.Attribute.Enumeration<['cover', 'contain-banner']> &
      Schema.Attribute.DefaultTo<'cover'>;
    tiles: Schema.Attribute.Component<
      'moments-milestone-section.moment-tile',
      true
    > &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          max: 2;
          min: 2;
        },
        number
      >;
  };
}

export interface MomentsMilestoneSectionMomentTile
  extends Struct.ComponentSchema {
  collectionName: 'components_moments_milestone_section_moment_tiles';
  info: {
    description: 'One stat tile inside a moment card. Exactly two per card.';
    displayName: 'moment-tile';
  };
  attributes: {
    label: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    rows: Schema.Attribute.Component<
      'moments-milestone-section.moment-tile-row',
      true
    > &
      Schema.Attribute.SetMinMax<
        {
          max: 4;
        },
        number
      >;
    value: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 40;
      }>;
    value_suffix: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
      }>;
  };
}

export interface MomentsMilestoneSectionMomentTileRow
  extends Struct.ComponentSchema {
  collectionName: 'components_moments_milestone_section_moment_tile_rows';
  info: {
    description: 'One supporting line inside a tile. Omit the value for a full-width statement row.';
    displayName: 'moment-tile-row';
  };
  attributes: {
    label: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
      }>;
    value: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
  };
}

export interface NewsSectionArticle extends Struct.ComponentSchema {
  collectionName: 'components_news_section_articles';
  info: {
    description: 'One blog card in the bottom carousel. The headline is four runs, not one accent-marked string: it carries three treatments (red italic, medium, regular).';
    displayName: 'article';
  };
  attributes: {
    author_avatar: Schema.Attribute.Media<'images'>;
    author_name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    author_role: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    image: Schema.Attribute.Media<'images'> & Schema.Attribute.Required;
    title_accent: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
    title_highlight: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
    title_lead: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
    title_tail: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 40;
      }>;
  };
}

export interface NewsSectionStory extends Struct.ComponentSchema {
  collectionName: 'components_news_section_stories';
  info: {
    description: 'One news story. Belongs to exactly one tab via `group`.';
    displayName: 'story';
  };
  attributes: {
    description: Schema.Attribute.Text & Schema.Attribute.Required;
    group: Schema.Attribute.Enumeration<
      ['signature-events', 'celebrity-news', 'academic-archives']
    > &
      Schema.Attribute.Required;
    image: Schema.Attribute.Media<'images'> & Schema.Attribute.Required;
    title: Schema.Attribute.Text & Schema.Attribute.Required;
  };
}

export interface NewsSectionTab extends Struct.ComponentSchema {
  collectionName: 'components_news_section_tabs';
  info: {
    description: 'One label in the news tab bar.';
    displayName: 'tab';
  };
  attributes: {
    group: Schema.Attribute.Enumeration<
      ['signature-events', 'celebrity-news', 'academic-archives']
    > &
      Schema.Attribute.Required;
    label: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
  };
}

export interface PlacementSectionAchiever extends Struct.ComponentSchema {
  collectionName: 'components_placement_section_achievers';
  info: {
    description: 'One name-verified placement on the cycling achiever card. Three of them.';
    displayName: 'achiever';
  };
  attributes: {
    company_logo: Schema.Attribute.Media<'images'> & Schema.Attribute.Required;
    designation: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
      }>;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
    person_image: Schema.Attribute.Media<'images'> & Schema.Attribute.Required;
    placed_in: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
      }>;
    salary_unit: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 10;
      }>;
    salary_value: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 20;
      }>;
  };
}

export interface PlacementSectionMetric extends Struct.ComponentSchema {
  collectionName: 'components_placement_section_metrics';
  info: {
    description: 'One headline tile above the dashboard. Four of them, at every width.';
    displayName: 'metric';
  };
  attributes: {
    label: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 40;
      }>;
    value: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 20;
      }>;
  };
}

export interface PlacementSectionPackageBand extends Struct.ComponentSchema {
  collectionName: 'components_placement_section_package_bands';
  info: {
    description: 'One salary band and the company count in it.';
    displayName: 'package-band';
  };
  attributes: {
    label: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 40;
      }>;
    value: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
  };
}

export interface PlacementSectionSuccessStory extends Struct.ComponentSchema {
  collectionName: 'components_placement_section_success_stories';
  info: {
    description: 'One placed student in the carousel. Belongs to exactly one stream tab via `stream` \u2014 a slug, since a Strapi enum cannot hold a space.';
    displayName: 'success-story';
  };
  attributes: {
    company_image: Schema.Attribute.Media<'images'> & Schema.Attribute.Required;
    designation: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
      }>;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
    person_image: Schema.Attribute.Media<'images'> & Schema.Attribute.Required;
    stream: Schema.Attribute.Enumeration<
      [
        'engineering',
        'business-management',
        'marketing',
        'applied-sciences',
        'hotel-management',
        'pharma',
      ]
    > &
      Schema.Attribute.Required;
    successful_sessions: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
  };
}

export interface PlacementSectionYearlyStat extends Struct.ComponentSchema {
  collectionName: 'components_placement_section_yearly_stats';
  info: {
    description: 'One placement year. The bar and donut series are derived from these rows.';
    displayName: 'yearly-stat';
  };
  attributes: {
    companies_visited: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    highest_package: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 20;
      }>;
    highest_package_intl: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 20;
      }>;
    package_bands: Schema.Attribute.Component<
      'placement-section.package-band',
      true
    > &
      Schema.Attribute.SetMinMax<
        {
          max: 8;
        },
        number
      >;
    students_placed: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    year: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 20;
      }>;
  };
}

export interface ProgramFeature extends Struct.ComponentSchema {
  collectionName: 'components_program_features';
  info: {
    description: 'One numbered highlight on the program page.';
    displayName: 'feature';
  };
  attributes: {
    description: Schema.Attribute.Text & Schema.Attribute.Required;
    image: Schema.Attribute.Media<'images'>;
    num: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 8;
      }>;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
      }>;
    title_highlight: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
      }>;
  };
}

export interface ProgramRole extends Struct.ComponentSchema {
  collectionName: 'components_program_roles';
  info: {
    description: 'One career role this program leads to.';
    displayName: 'role';
  };
  attributes: {
    label: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
  };
}

export interface SeeUsInActionSectionCarouselItem
  extends Struct.ComponentSchema {
  collectionName: 'components_see_us_in_action_section_carousel_items';
  info: {
    description: 'One slide of the infinite video carousel.';
    displayName: 'carousel-item';
  };
  attributes: {
    thumbnail: Schema.Attribute.Media<'images'>;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    video_link: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SeeUsInActionSectionCategory extends Struct.ComponentSchema {
  collectionName: 'components_see_us_in_action_section_categories';
  info: {
    description: 'One entry in the icon strip: a still, an icon, and the clip it opens.';
    displayName: 'category';
  };
  attributes: {
    icon: Schema.Attribute.Enumeration<
      [
        'building',
        'book',
        'cpu',
        'sports',
        'tree',
        'microscope',
        'bed',
        'utensils',
      ]
    > &
      Schema.Attribute.Required;
    image: Schema.Attribute.Media<'images'> & Schema.Attribute.Required;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 40;
      }>;
    video_url: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface TestimonialSectionAchieverVideo
  extends Struct.ComponentSchema {
  collectionName: 'components_testimonial_section_achiever_videos';
  info: {
    description: 'One clip in the auto-scrolling strip under the reels. The still comes from YouTube, so there is nothing to upload.';
    displayName: 'achiever-video';
  };
  attributes: {
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
      }>;
    video_link: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface TestimonialSectionTestimonial extends Struct.ComponentSchema {
  collectionName: 'components_testimonial_section_testimonials';
  info: {
    description: 'One 9:16 reel card. The clip plays inline once the card becomes the active one; the thumbnail is what everything else shows.';
    displayName: 'testimonial';
  };
  attributes: {
    thumbnail: Schema.Attribute.Media<'images'>;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    video_link: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface TraditionSectionAlumnus extends Struct.ComponentSchema {
  collectionName: 'components_tradition_section_alumni';
  info: {
    description: 'One notable alumnus, shown in the desktop bento and the mobile card stack.';
    displayName: 'alumnus';
  };
  attributes: {
    image: Schema.Attribute.Media<'images'> & Schema.Attribute.Required;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
    role: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
    status: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
  };
}

export interface TraditionSectionHighlightPhoto extends Struct.ComponentSchema {
  collectionName: 'components_tradition_section_highlight_photos';
  info: {
    description: 'One captioned photo in the highlights grid.';
    displayName: 'highlight-photo';
  };
  attributes: {
    image: Schema.Attribute.Media<'images'> & Schema.Attribute.Required;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
  };
}

export interface TraditionSectionHighlightSlide extends Struct.ComponentSchema {
  collectionName: 'components_tradition_section_highlight_slides';
  info: {
    description: 'One slide of the auto-rotating headline carousel.';
    displayName: 'highlight-slide';
  };
  attributes: {
    description: Schema.Attribute.Text & Schema.Attribute.Required;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
  };
}

export interface TraditionSectionQuickLink extends Struct.ComponentSchema {
  collectionName: 'components_tradition_section_quick_links';
  info: {
    description: 'One row in the quick-links list on the mobile stats card.';
    displayName: 'quick-link';
  };
  attributes: {
    label: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    link: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface TraditionSectionStat extends Struct.ComponentSchema {
  collectionName: 'components_tradition_section_stats';
  info: {
    description: 'One counter tile in the stats grid.';
    displayName: 'stat';
  };
  attributes: {
    label: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 30;
      }>;
    note: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
      }>;
    value: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 20;
      }>;
  };
}

export interface WhyChooseCuSectionReason extends Struct.ComponentSchema {
  collectionName: 'components_why_choose_cu_section_reasons';
  info: {
    description: 'One reason card. Belongs to exactly one tab via `group`.';
    displayName: 'reason';
  };
  attributes: {
    card_title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
      }>;
    description: Schema.Attribute.Text & Schema.Attribute.Required;
    group: Schema.Attribute.Enumeration<
      ['distinctive-edge', 'ai-first-advantage', 'futuristic-academics']
    > &
      Schema.Attribute.Required;
    images: Schema.Attribute.Media<'images', true> & Schema.Attribute.Required;
    mobile_subtitle: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 20;
      }>;
    mobile_title: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 20;
      }>;
    subtitle: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 40;
      }>;
  };
}

declare module '@strapi/strapi' {
  export namespace Public {
    export interface ComponentSchemas {
      'campus-life-section.gallery': CampusLifeSectionGallery;
      'faq-section.entry': FaqSectionEntry;
      'innovation-startups-section.grid-tile': InnovationStartupsSectionGridTile;
      'innovation-startups-section.pillar': InnovationStartupsSectionPillar;
      'innovation-startups-section.pillar-chip': InnovationStartupsSectionPillarChip;
      'innovation-startups-section.startup': InnovationStartupsSectionStartup;
      'innovation-startups-section.stat': InnovationStartupsSectionStat;
      'international-section.advantage-card': InternationalSectionAdvantageCard;
      'moments-milestone-section.moment-card': MomentsMilestoneSectionMomentCard;
      'moments-milestone-section.moment-tile': MomentsMilestoneSectionMomentTile;
      'moments-milestone-section.moment-tile-row': MomentsMilestoneSectionMomentTileRow;
      'news-section.article': NewsSectionArticle;
      'news-section.story': NewsSectionStory;
      'news-section.tab': NewsSectionTab;
      'placement-section.achiever': PlacementSectionAchiever;
      'placement-section.metric': PlacementSectionMetric;
      'placement-section.package-band': PlacementSectionPackageBand;
      'placement-section.success-story': PlacementSectionSuccessStory;
      'placement-section.yearly-stat': PlacementSectionYearlyStat;
      'program.feature': ProgramFeature;
      'program.role': ProgramRole;
      'see-us-in-action-section.carousel-item': SeeUsInActionSectionCarouselItem;
      'see-us-in-action-section.category': SeeUsInActionSectionCategory;
      'testimonial-section.achiever-video': TestimonialSectionAchieverVideo;
      'testimonial-section.testimonial': TestimonialSectionTestimonial;
      'tradition-section.alumnus': TraditionSectionAlumnus;
      'tradition-section.highlight-photo': TraditionSectionHighlightPhoto;
      'tradition-section.highlight-slide': TraditionSectionHighlightSlide;
      'tradition-section.quick-link': TraditionSectionQuickLink;
      'tradition-section.stat': TraditionSectionStat;
      'why-choose-cu-section.reason': WhyChooseCuSectionReason;
    }
  }
}
