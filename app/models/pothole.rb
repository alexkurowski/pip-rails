class Pothole < ApplicationRecord
  acts_as_mappable lat_column_name: :latitude,
                   lng_column_name: :longitude

  def self.excluding_fixed exclude
    if exclude
    then self.where(fixed_at: nil)
    else self
    end
  end

  def self.markers_in_bounds bounds
    self
      .in_bounds(bounds)
      .map do |pothole|
        {
          'id': pothole.id,
          'lat': pothole.latitude,
          'lng': pothole.longitude,
          'category': pothole.category,
          'label': pothole.time_since_created,
          'alertLevel': pothole.alert_level,
          'fixed': !pothole.fixed_at.nil?
        }
      end
  end

  def time_since_created
    end_time = fixed_at || Time.now

    time = (end_time - created_at).to_i.round
    days = time / 1.day
    hours = ( time - days * 1.day ) / 1.hour
    minutes = ( time - days * 1.day - hours * 1.hour ) / 1.minute

    if days <= 99
    then "%02d:%02d:%02d" % [days, hours, minutes]
    else "%d days" % days
    end
  end

  def alert_level
    case
    when created_at < 3.months.ago
      4
    when created_at < 2.month.ago
      3
    when created_at < 1.month.ago
      2
    else
      1
    end
  end
end
